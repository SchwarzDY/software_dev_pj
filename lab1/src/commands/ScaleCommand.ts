import { Document } from "../domain/Document";
import { EditorError } from "../domain/EditorError";
import { fmtNum } from "../domain/num";
import type { Command } from "./Command";

/** scale <id> <factor>：等比缩放全部几何属性；undo 用倒数还原。 */
export class ScaleCommand implements Command {
  private readonly doc: Document;
  private readonly id: string;
  private readonly factor: number;

  constructor(doc: Document, id: string, factor: number) {
    this.doc = doc;
    this.id = id;
    this.factor = factor;
  }

  execute(): string {
    if (this.factor <= 0) throw new EditorError("scale factor must be positive");
    const shape = this.doc.require(this.id);
    shape.scale(this.factor);
    return `${shape.ref()} scaled by ${fmtNum(this.factor)}`;
  }

  undo(): string {
    const shape = this.doc.require(this.id);
    const inverse = 1 / this.factor;
    shape.scale(inverse);
    return `${shape.ref()} scaled back by ${fmtNum(inverse)}`;
  }
}
