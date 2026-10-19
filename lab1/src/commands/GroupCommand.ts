import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import { EditorError } from "../domain/EditorError";
import type { Shape } from "../domain/Shape";
import type { Command } from "./Command";

/**
 * group <newGid> <id1> <id2>…：新建容器并收编成员（一个 undo 单元）。
 * 新 g 插入到第一个成员在原父容器中的原位置（裁定 D7）；
 * 校验全部通过后才变更（原子性），容器与其子孙同组时报错并点名容器。
 */
export class GroupCommand implements Command {
  private readonly doc: Document;
  private readonly newId: string;
  private readonly memberIds: string[];
  private group?: Group;
  private origins: { parent: Group; index: number }[] = [];

  constructor(doc: Document, newId: string, memberIds: string[]) {
    this.doc = doc;
    this.newId = newId;
    this.memberIds = memberIds;
  }

  execute(): string {
    if (this.memberIds.length === 0) throw new EditorError("group needs at least one member");
    if (this.doc.get(this.newId) !== undefined) throw new EditorError(`id already exists: ${this.newId}`);

    const members = this.memberIds.map((id) => this.doc.require(id));
    this.checkNoNesting(members);

    // 记录每个成员的原位（成员必有父容器：创建后即挂树）
    const origins = members.map((m) => {
      const parent = m.parent;
      if (parent === null) throw new Error("shape without parent");
      return { parent, index: parent.children.indexOf(m) };
    });

    const group = new Group(this.newId);
    for (const m of members) (m.parent as Group).removeChild(m);
    for (const m of members) group.appendChild(m);
    origins[0].parent.insertChildAt(group, origins[0].index);

    this.doc.register(group);
    this.group = group;
    this.origins = origins;
    return `${group.ref()} created with ${members.length} children`;
  }

  undo(): string {
    const group = this.group;
    if (group === undefined) throw new Error("undo before execute");
    const parent = group.parent;
    if (parent === null) throw new Error("group without parent");
    parent.removeChild(group);
    const members = [...group.children];
    for (const m of members) group.removeChild(m); // 先清空容器再注销，避免成员 id 被连带清除
    this.doc.unregister(group);
    // 按原顺序、原索引放回原父容器；同一父容器内索引升序逐一插回即还原
    this.origins.forEach((o, i) => o.parent.insertChildAt(members[i], o.index));
    return `${group.ref()} removed, ${members.length} shapes restored`;
  }

  private checkNoNesting(members: Shape[]): void {
    for (const m of members) {
      if (!(m instanceof Group)) continue;
      for (const other of members) {
        if (other !== m && other.isDescendantOf(m)) {
          throw new EditorError(`cannot group a container into its own descendant: ${m.id}`);
        }
      }
    }
  }
}
