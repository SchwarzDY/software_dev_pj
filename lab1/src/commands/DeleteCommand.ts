import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import type { Shape } from "../domain/Shape";
import type { Command } from "./Command";

/** delete <id>：容器连同全部子孙；undo 整树恢复到原位置。 */
export class DeleteCommand implements Command {
  private readonly doc: Document;
  private readonly id: string;
  private shape?: Shape;
  private parent?: Group;
  private index = 0;

  constructor(doc: Document, id: string) {
    this.doc = doc;
    this.id = id;
  }

  execute(): string {
    const shape = this.doc.require(this.id);
    const parent = shape.parent;
    if (parent === null) throw new Error("shape without parent");
    const index = parent.children.indexOf(shape);
    parent.removeChild(shape);
    this.doc.unregister(shape);
    this.shape = shape;
    this.parent = parent;
    this.index = index;
    return `${shape.ref()} deleted`;
  }

  undo(): string {
    const shape = this.shape;
    const parent = this.parent;
    if (shape === undefined || parent === undefined) throw new Error("undo before execute");
    parent.insertChildAt(shape, this.index);
    this.doc.register(shape); // register 整树登记：容器连同子孙恢复索引
    const where = parent === this.doc.root ? "svg" : parent.ref();
    return `${shape.ref()} restored into ${where}`;
  }
}
