import { Document } from "../domain/Document";
import type { Command } from "./Command";

/** move <id> <dx> <dy>：叶子报新位置、容器报增量（回显文案由图形的多态 moveFeedback 生成）。 */
export class MoveCommand implements Command {
  private readonly doc: Document;
  private readonly id: string;
  private readonly dx: number;
  private readonly dy: number;

  constructor(doc: Document, id: string, dx: number, dy: number) {
    this.doc = doc;
    this.id = id;
    this.dx = dx;
    this.dy = dy;
  }

  execute(): string {
    const shape = this.doc.require(this.id);
    shape.move(this.dx, this.dy);
    return shape.moveFeedback(this.dx, this.dy, false);
  }

  undo(): string {
    const shape = this.doc.require(this.id);
    shape.move(-this.dx, -this.dy);
    return shape.moveFeedback(this.dx, this.dy, true);
  }
}
