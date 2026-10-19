import { Shape } from "./Shape";
import { escapeXml } from "./xml";
import { fmtNum, parseNum } from "./num";

export class Text extends Shape {
  x: number;
  y: number;
  content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.x = x;
    this.y = y;
    this.content = content;
  }

  get typeName(): string {
    return "text";
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /** font-size 不在 set 白名单内，不视为几何属性，故不参与缩放（裁定 D10）。 */
  scale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }

  setAttribute(attr: string, value: string): void {
    if (attr === "x") this.x = parseNum(value);
    else if (attr === "y") this.y = parseNum(value);
    else if (attr === "text") this.content = value;
    else super.setAttribute(attr, value);
  }

  protected anchor(): [number, number] {
    return [this.x, this.y];
  }

  getAttributeText(attr: string): string | undefined {
    if (attr === "x") return fmtNum(this.x);
    if (attr === "y") return fmtNum(this.y);
    if (attr === "text") return this.content;
    return super.getAttributeText(attr);
  }

  protected geometrySummary(): string {
    return `(${fmtNum(this.x)},${fmtNum(this.y)}) "${this.content}"`;
  }

  toSvg(indent: string): string {
    return (
      `${indent}<text id="${this.id}" x="${fmtNum(this.x)}" y="${fmtNum(this.y)}"` +
      `${this.svgAppearance()}>${escapeXml(this.content)}</text>`
    );
  }
}
