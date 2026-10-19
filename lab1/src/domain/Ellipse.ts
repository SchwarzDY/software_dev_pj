import { Shape } from "./Shape";
import { fmtNum, parseNum } from "./num";

export class Ellipse extends Shape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id);
    this.cx = cx;
    this.cy = cy;
    this.rx = rx;
    this.ry = ry;
    this.fill = fill;
  }

  get typeName(): string {
    return "ellipse";
  }

  move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  scale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.rx *= factor;
    this.ry *= factor;
  }

  setAttribute(attr: string, value: string): void {
    if (attr === "cx") this.cx = parseNum(value);
    else if (attr === "cy") this.cy = parseNum(value);
    else if (attr === "rx") this.rx = parseNum(value);
    else if (attr === "ry") this.ry = parseNum(value);
    else super.setAttribute(attr, value);
  }

  protected geometrySummary(): string {
    return `cx=${fmtNum(this.cx)} cy=${fmtNum(this.cy)} rx=${fmtNum(this.rx)} ry=${fmtNum(this.ry)}`;
  }

  toSvg(indent: string): string {
    return (
      `${indent}<ellipse id="${this.id}" cx="${fmtNum(this.cx)}" cy="${fmtNum(this.cy)}"` +
      ` rx="${fmtNum(this.rx)}" ry="${fmtNum(this.ry)}"${this.svgAppearance()}/>`
    );
  }
}
