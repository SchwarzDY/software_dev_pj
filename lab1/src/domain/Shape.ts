import type { Group } from "./Group";
import { EditorError } from "./EditorError";
import { fmtNum, parseNum } from "./num";

/**
 * 图形树的统一抽象（Composite 的 Component）：
 * 叶子图形与容器 Group 面向命令层呈现同一组操作。
 * 图形自持序列化（toSvg）与 tree 显示（summary）——有意不用 Visitor，
 * 取舍理由见 doc/README.md「设计模式的选择」。
 */
export abstract class Shape {
  readonly id: string;
  parent: Group | null = null;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;

  protected constructor(id: string) {
    this.id = id;
  }

  abstract get typeName(): string;
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract toSvg(indent: string): string;

  /** 几何属性摘要（不含公共外观属性），如 "x=0 y=0 w=10 h=10"；容器返回空串。 */
  protected abstract geometrySummary(): string;

  /** tree 行尾摘要：几何 + 已设置的外观属性，如 "x=0 y=0 w=10 h=10 fill=red"。 */
  summary(): string {
    return [this.geometrySummary(), ...this.appearanceParts()].filter((s) => s !== "").join(" ");
  }

  /** show 用的外观属性行，每行一条、带缩进。 */
  appearanceLines(): string[] {
    return this.appearanceParts().map((p) => "  " + p);
  }

  protected appearanceParts(): string[] {
    const parts: string[] = [];
    if (this.fill !== undefined) parts.push(`fill=${this.fill}`);
    if (this.stroke !== undefined) parts.push(`stroke=${this.stroke}`);
    if (this.strokeWidth !== undefined) parts.push(`stroke-width=${fmtNum(this.strokeWidth)}`);
    return parts;
  }

  /** set 命令入口：公共外观属性在此处理；几何属性由各子类 override 后兜底回此处。 */
  setAttribute(attr: string, value: string): void {
    if (attr === "fill") this.fill = value;
    else if (attr === "stroke") this.stroke = value;
    else if (attr === "stroke-width") this.strokeWidth = parseNum(value);
    else throw new EditorError(`unknown attribute: ${attr}`);
  }

  /** 公共外观属性的序列化片段（带前导空格；未设置的属性不写入）。 */
  protected svgAppearance(): string {
    let s = "";
    if (this.fill !== undefined) s += ` fill="${this.fill}"`;
    if (this.stroke !== undefined) s += ` stroke="${this.stroke}"`;
    if (this.strokeWidth !== undefined) s += ` stroke-width="${fmtNum(this.strokeWidth)}"`;
    return s;
  }

  /** 命令回显里的引用名，如 "circle#c1"。 */
  ref(): string {
    return `${this.typeName}#${this.id}`;
  }

  /** move 命令的回显：叶子报新位置；容器由 Group 覆写为增量。 */
  moveFeedback(dx: number, dy: number, undoing: boolean): string {
    const [ax, ay] = this.anchor();
    return `${this.ref()} moved ${undoing ? "back to" : "to"} (${fmtNum(ax)},${fmtNum(ay)})`;
  }

  /** 叶子图形的锚点（move 回显用）；容器无锚点。 */
  protected anchor(): [number, number] {
    throw new Error("container has no anchor");
  }

  /** 读取属性当前值（show 显示与 set 的 undo 用）；未设置的外观属性返回 undefined。 */
  getAttributeText(attr: string): string | undefined {
    if (attr === "fill") return this.fill;
    if (attr === "stroke") return this.stroke;
    if (attr === "stroke-width") return this.strokeWidth === undefined ? undefined : fmtNum(this.strokeWidth);
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  /** 清除外观属性（set 的 undo 在属性原先未设置时使用）。 */
  clearAttribute(attr: string): void {
    if (attr === "fill") this.fill = undefined;
    else if (attr === "stroke") this.stroke = undefined;
    else if (attr === "stroke-width") this.strokeWidth = undefined;
    else throw new EditorError(`unknown attribute: ${attr}`);
  }

  /** 自身是否挂在 other（或其子孙容器）之下——group 命令的环校验用。 */
  isDescendantOf(other: Group): boolean {
    let p: Group | null = this.parent;
    while (p !== null) {
      if (p === other) return true;
      p = p.parent;
    }
    return false;
  }
}
