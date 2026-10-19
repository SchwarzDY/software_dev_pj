import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import { EditorError } from "../domain/EditorError";
import type { Command } from "./Command";

/** addto <gid> <id>：把已有图形移入容器作最后一个子节点；禁止造成环（裁定 D13）。 */
export class AddToCommand implements Command {
  private readonly doc: Document;
  private readonly gid: string;
  private readonly id: string;
  private parent?: Group;
  private index = 0;

  constructor(doc: Document, gid: string, id: string) {
    this.doc = doc;
    this.gid = gid;
    this.id = id;
  }

  execute(): string {
    const target = this.doc.get(this.gid);
    if (target === undefined) throw new EditorError(`no such shape: ${this.gid}`);
    if (!(target instanceof Group)) throw new EditorError(`not a container: ${this.gid}`);

    const shape = this.doc.require(this.id);
    if (shape instanceof Group && (shape === target || target.isDescendantOf(shape))) {
      throw new EditorError(`cannot move a container into its own descendant: ${shape.id}`);
    }

    const parent = shape.parent;
    if (parent === null) throw new Error("shape without parent");
    const index = parent.children.indexOf(shape);
    parent.removeChild(shape);
    target.appendChild(shape);
    this.parent = parent;
    this.index = index;
    return `${shape.ref()} added to ${target.ref()}`;
  }

  undo(): string {
    const shape = this.doc.require(this.id);
    const parent = this.parent;
    if (parent === undefined) throw new Error("undo before execute");
    const current = shape.parent;
    if (current !== null) current.removeChild(shape);
    parent.insertChildAt(shape, Math.min(this.index, parent.children.length));
    return `${shape.ref()} restored`;
  }
}
