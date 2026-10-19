import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import { EditorError } from "../domain/EditorError";
import type { Shape } from "../domain/Shape";
import type { Command } from "./Command";

/**
 * ungroup <gid>：子图形提升到原容器的父级、占据原容器的位置；
 * 根级容器拒绝（规范 4.2），非容器复用 not a container 措辞（裁定 D12）。
 */
export class UngroupCommand implements Command {
  private readonly doc: Document;
  private readonly id: string;
  private group?: Group;
  private parent?: Group;
  private index = 0;
  private children: Shape[] = [];

  constructor(doc: Document, id: string) {
    this.doc = doc;
    this.id = id;
  }

  execute(): string {
    const shape = this.doc.require(this.id);
    if (!(shape instanceof Group)) throw new EditorError(`not a container: ${this.id}`);
    const parent = shape.parent;
    if (parent === null) throw new Error("shape without parent");
    if (parent === this.doc.root) throw new EditorError(`cannot ungroup top-level container: ${this.id}`);
    const index = parent.children.indexOf(shape);
    const children = [...shape.children];

    parent.removeChild(shape);
    let at = index;
    for (const c of children) {
      shape.removeChild(c); // 先摘子节点再注销：unregister 才不会连带清掉它们的 id
      parent.insertChildAt(c, at);
      at += 1;
    }
    this.doc.unregister(shape);

    this.group = shape;
    this.parent = parent;
    this.index = index;
    this.children = children;
    return `${shape.ref()} ungrouped, ${children.length} children promoted`;
  }

  undo(): string {
    const group = this.group;
    const parent = this.parent;
    if (group === undefined || parent === undefined) throw new Error("undo before execute");
    for (const c of this.children) parent.removeChild(c);
    parent.insertChildAt(group, Math.min(this.index, parent.children.length));
    for (const c of this.children) group.appendChild(c);
    this.doc.register(group);
    return `${group.ref()} restored`;
  }
}
