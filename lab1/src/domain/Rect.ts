import { Shape } from "./Shape";
import { fmtNum, parseNum } from "./num";

export class Rect extends Shape {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fill = fill;
  }

  get typeName(): string {
    return "rect";
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  scale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
    this.width *= factor;
    this.height *= factor;
  }

  setAttribute(attr: string, value: string): void {
    if (attr === "x") this.x = parseNum(value);
    else if (attr === "y") this.y = parseNum(value);
    else if (attr === "width") this.width = parseNum(value);
    else if (attr === "height") this.height = parseNum(value);
    else super.setAttribute(attr, value);
  }

  protected anchor(): [number, number] {
    return [this.x, this.y];
  }

  getAttributeText(attr: string): string | undefined {
    if (attr === "x") return fmtNum(this.x);
    if (attr === "y") return fmtNum(this.y);
    if (attr === "width") return fmtNum(this.width);
    if (attr === "height") return fmtNum(this.height);
    return super.getAttributeText(attr);
  }

  protected geometrySummary(): string {
    return `x=${fmtNum(this.x)} y=${fmtNum(this.y)} w=${fmtNum(this.width)} h=${fmtNum(this.height)}`;
  }

  toSvg(indent: string): string {
    return (
      `${indent}<rect id="${this.id}" x="${fmtNum(this.x)}" y="${fmtNum(this.y)}"` +
      ` width="${fmtNum(this.width)}" height="${fmtNum(this.height)}"${this.svgAppearance()}/>`
    );
  }
}
