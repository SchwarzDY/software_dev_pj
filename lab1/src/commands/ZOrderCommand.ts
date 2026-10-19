import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import type { Command } from "./Command";

/**
 * front / back 的公共骨架（模板方法）：
 * front 移到同级末尾（SVG 中后画的在上层），back 移到同级开头；
 * undo 恢复原索引。
 */
export abstract class ZOrderCommand implements Command {
  protected readonly doc: Document;
  protected readonly id: string;
  private parent?: Group;
  private index = 0;

  constructor(doc: Document, id: string) {
    this.doc = doc;
    this.id = id;
  }

  /** true = front（移到最前），false = back（移到最后）。 */
  protected abstract toFront(): boolean;

  execute(): string {
    const shape = this.doc.require(this.id);
    const parent = shape.parent;
    if (parent === null) throw new Error("shape without parent");
    const index = parent.children.indexOf(shape);
    parent.removeChild(shape);
    if (this.toFront()) parent.appendChild(shape);
    else parent.insertChildAt(shape, 0);
    this.parent = parent;
    this.index = index;
    return `${shape.ref()} moved to ${this.toFront() ? "front" : "back"}`;
  }

  undo(): string {
    const shape = this.doc.require(this.id);
    const parent = this.parent;
    if (parent === undefined) throw new Error("undo before execute");
    const current = shape.parent;
    if (current !== null) current.removeChild(shape);
    parent.insertChildAt(shape, Math.min(this.index, parent.children.length));
    return `${shape.ref()} z-order restored`;
  }
}
