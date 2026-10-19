import { readFileSync } from "node:fs";
import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import { EditorError } from "../domain/EditorError";
import { ShapeFactory } from "../domain/ShapeFactory";
import type { Shape } from "../domain/Shape";

export interface ParseResult {
  doc: Document;
  warnings: string[];
}

interface Frame {
  tag: string;
  /** 容器帧：后续子节点挂到这里；跳过帧与叶子帧为 null。 */
  group: Group | null;
  /** text 帧的延迟构造信息（内容要到闭合标签才收集完）。 */
  pendingText: { id: string; x: string; y: string; parent: Group } | null;
  textContent: string;
}

const LEAF_TAGS = new Set(["rect", "circle", "ellipse", "line", "text"]);
const TAG_RE = /<(\/)?([a-zA-Z][\w:.-]*)((?:\s+[a-zA-Z_:][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/)?>/g;

/**
 * SVG 文本 → Document。宽容规则（裁定 D17）：
 * 缺 id 自动补号并警告；重复 id 自动改派并警告；未支持的元素整棵跳过并警告；
 * 缺失/非法的几何属性按 0；画布尺寸缺 width/height 时取 viewBox。
 * 所有图形构造都经 ShapeFactory（名字分派不新增第三处）。
 */
export class SvgParser {
  static readFile(path: string): ParseResult {
    let text: string;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }
    return SvgParser.parseText(text);
  }

  static parseText(source: string): ParseResult {
    const warnings: string[] = [];
    const cleaned = source.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
    const rootMatch = cleaned.match(/<svg\b([^>]*)>([\s\S]*)<\/svg\s*>/i);
    if (rootMatch === null) throw new EditorError("not a valid svg document");

    const rootAttrs = SvgParser.parseAttrs(rootMatch[1] ?? "");
    const size = SvgParser.canvasSize(rootAttrs);
    const doc = new Document(size.width, size.height);

    const usedIds = new Set<string>();
    const counters = new Map<string, number>();
    const stack: Frame[] = [{ tag: "svg", group: doc.root, pendingText: null, textContent: "" }];

    const inner = rootMatch[2] ?? "";
    TAG_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    let cursor = 0;
    while ((match = TAG_RE.exec(inner)) !== null) {
      const between = inner.slice(cursor, match.index);
      cursor = match.index + match[0].length;
      const top = stack[stack.length - 1];
      if (top !== undefined && top.pendingText !== null) top.textContent += between;

      const closing = match[1] !== undefined;
      const tag = (match[2] ?? "").toLowerCase();
      const selfClosing = match[4] !== undefined;

      if (closing) {
        SvgParser.closeFrame(stack, tag, doc);
        continue;
      }

      const attrs = SvgParser.parseAttrs(match[3] ?? "");
      const parent = stack[stack.length - 1];
      const attachable = parent !== undefined && parent.group !== null && parent.pendingText === null;
      const known = tag === "g" || LEAF_TAGS.has(tag);
      if (!attachable || !known) {
        if (attachable && !known) warnings.push(`warning: skipped unsupported element <${tag}>`);
        if (!selfClosing) stack.push({ tag, group: null, pendingText: null, textContent: "" });
        continue;
      }

      const parentGroup = parent.group;
      if (parentGroup === null) continue; // attachable 已保证非空，此处仅为类型收窄
      const id = SvgParser.resolveId(tag, attrs, usedIds, counters, warnings);

      if (tag === "text") {
        const x = SvgParser.numStr(attrs, "x");
        const y = SvgParser.numStr(attrs, "y");
        if (selfClosing) {
          const shape = ShapeFactory.create("text", id, [x, y, ""]);
          parentGroup.appendChild(shape);
          doc.register(shape);
        } else {
          stack.push({ tag, group: null, pendingText: { id, x, y, parent: parentGroup }, textContent: "" });
        }
        continue;
      }

      const shape = ShapeFactory.create(tag, id, SvgParser.factoryArgs(tag, attrs));
      parentGroup.appendChild(shape);
      doc.register(shape);
      if (tag === "g" && !selfClosing && shape instanceof Group) {
        stack.push({ tag, group: shape, pendingText: null, textContent: "" });
      }
    }
    return { doc, warnings };
  }

  /** 弹栈到匹配的闭合标签；text 帧在此时构造图形（内容已收集完）。 */
  private static closeFrame(stack: Frame[], tag: string, doc: Document): void {
    for (let i = stack.length - 1; i >= 1; i -= 1) {
      const frame = stack.pop();
      if (frame === undefined) break;
      if (frame.pendingText !== null) {
        const content = SvgParser.unescape(frame.textContent.trim());
        const shape = ShapeFactory.create("text", frame.pendingText.id, [
          frame.pendingText.x,
          frame.pendingText.y,
          content,
        ]);
        frame.pendingText.parent.appendChild(shape);
        doc.register(shape);
      }
      if (frame.tag === tag) break;
    }
  }

  private static resolveId(
    tag: string,
    attrs: Map<string, string>,
    usedIds: Set<string>,
    counters: Map<string, number>,
    warnings: string[]
  ): string {
    const given = attrs.get("id");
    if (given !== undefined && !usedIds.has(given)) {
      usedIds.add(given);
      return given;
    }
    let n = (counters.get(tag) ?? 0) + 1;
    while (usedIds.has(`${tag}${n}`)) n += 1;
    counters.set(tag, n);
    const assigned = `${tag}${n}`;
    usedIds.add(assigned);
    if (given === undefined) {
      warnings.push(`warning: assigned id ${assigned} to unnamed <${tag}>`);
    } else {
      warnings.push(`warning: assigned id ${assigned} to <${tag}> (duplicate id: ${given})`);
    }
    return assigned;
  }

  /** XML 属性 → create 参数的翻译表（io 的格式知识，不属于名字分派）。 */
  private static factoryArgs(tag: string, a: Map<string, string>): string[] {
    const n = (name: string): string => SvgParser.numStr(a, name);
    const opt = (name: string): string[] => (a.has(name) ? [SvgParser.unescape(a.get(name) ?? "")] : []);
    if (tag === "rect") return [n("x"), n("y"), n("width"), n("height"), ...opt("fill")];
    if (tag === "circle") return [n("cx"), n("cy"), n("r"), ...opt("fill")];
    if (tag === "ellipse") return [n("cx"), n("cy"), n("rx"), n("ry"), ...opt("fill")];
    if (tag === "line") return [n("x1"), n("y1"), n("x2"), n("y2"), ...opt("stroke")];
    return []; // g
  }

  private static numStr(attrs: Map<string, string>, name: string): string {
    const raw = attrs.get(name);
    if (raw === undefined) return "0";
    return Number.isFinite(Number(raw)) ? raw : "0";
  }

  private static parseAttrs(source: string): Map<string, string> {
    const attrs = new Map<string, string>();
    const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      attrs.set(m[1], m[3] ?? m[4] ?? "");
    }
    return attrs;
  }

  private static canvasSize(attrs: Map<string, string>): { width: number; height: number } {
    let width = Number(attrs.get("width"));
    let height = Number(attrs.get("height"));
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      const vb = (attrs.get("viewBox") ?? "").trim().split(/[\s,]+/);
      const vw = Number(vb[2]);
      const vh = Number(vb[3]);
      if (!Number.isFinite(width) && Number.isFinite(vw)) width = vw;
      if (!Number.isFinite(height) && Number.isFinite(vh)) height = vh;
    }
    return {
      width: Number.isFinite(width) && width > 0 ? width : 800,
      height: Number.isFinite(height) && height > 0 ? height : 600,
    };
  }

  private static unescape(s: string): string {
    return s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }
}
