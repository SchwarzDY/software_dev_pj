import { Shape } from "./Shape";

/**
 * 容器（Composite 的 Composite 节点）：自身无几何属性，
 * move/scale 递归转发到子孙；序列化为 <g>。
 * set 白名单只有公共三项 fill/stroke/stroke-width（基类行为，几何属性对容器报 unknown attribute，裁定 D8）。
 */
export class Group extends Shape {
  readonly children: Shape[] = [];

  constructor(id: string) {
    super(id);
  }

  get typeName(): string {
    return "g";
  }

  move(dx: number, dy: number): void {
    for (const c of this.children) c.move(dx, dy);
  }

  scale(factor: number): void {
    for (const c of this.children) c.scale(factor);
  }

  appendChild(child: Shape): void {
    child.parent = this;
    this.children.push(child);
  }

  insertChildAt(child: Shape, index: number): void {
    child.parent = this;
    this.children.splice(index, 0, child);
  }

  removeChild(child: Shape): void {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
  }

  /** 深度优先收集全部子孙（不含自身）。 */
  descendants(): Shape[] {
    const out: Shape[] = [];
    for (const c of this.children) {
      out.push(c);
      if (c instanceof Group) out.push(...c.descendants());
    }
    return out;
  }

  protected geometrySummary(): string {
    return "";
  }

  toSvg(indent: string): string {
    if (this.children.length === 0) {
      return `${indent}<g id="${this.id}"${this.svgAppearance()}/>`;
    }
    const inner = this.children.map((c) => c.toSvg(indent + "  ")).join("\n");
    return `${indent}<g id="${this.id}"${this.svgAppearance()}>\n${inner}\n${indent}</g>`;
  }
}
