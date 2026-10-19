import { Shape } from "./Shape";
import { fmtNum, parseNum } from "./num";

export class Circle extends Shape {
  cx: number;
  cy: number;
  r: number;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this.cx = cx;
    this.cy = cy;
    this.r = r;
    this.fill = fill;
  }

  get typeName(): string {
    return "circle";
  }

  move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.r *= factor;
  }

  setAttribute(attr: string, value: string): void {
    if (attr === "cx") this.cx = parseNum(value);
    else if (attr === "cy") this.cy = parseNum(value);
    else if (attr === "r") this.r = parseNum(value);
    else super.setAttribute(attr, value);
  }

  protected geometrySummary(): string {
    return `cx=${fmtNum(this.cx)} cy=${fmtNum(this.cy)} r=${fmtNum(this.r)}`;
  }

  toSvg(indent: string): string {
    return (
      `${indent}<circle id="${this.id}" cx="${fmtNum(this.cx)}" cy="${fmtNum(this.cy)}"` +
      ` r="${fmtNum(this.r)}"${this.svgAppearance()}/>`
    );
  }
}
