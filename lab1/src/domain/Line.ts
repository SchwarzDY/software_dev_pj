import { Shape } from "./Shape";
import { fmtNum, parseNum } from "./num";

export class Line extends Shape {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.stroke = stroke;
  }

  get typeName(): string {
    return "line";
  }

  move(dx: number, dy: number): void {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }

  scale(factor: number): void {
    this.x1 *= factor;
    this.y1 *= factor;
    this.x2 *= factor;
    this.y2 *= factor;
  }

  setAttribute(attr: string, value: string): void {
    if (attr === "x1") this.x1 = parseNum(value);
    else if (attr === "y1") this.y1 = parseNum(value);
    else if (attr === "x2") this.x2 = parseNum(value);
    else if (attr === "y2") this.y2 = parseNum(value);
    else super.setAttribute(attr, value);
  }

  protected geometrySummary(): string {
    return `(${fmtNum(this.x1)},${fmtNum(this.y1)}) -> (${fmtNum(this.x2)},${fmtNum(this.y2)})`;
  }

  toSvg(indent: string): string {
    return (
      `${indent}<line id="${this.id}" x1="${fmtNum(this.x1)}" y1="${fmtNum(this.y1)}"` +
      ` x2="${fmtNum(this.x2)}" y2="${fmtNum(this.y2)}"${this.svgAppearance()}/>`
    );
  }
}
