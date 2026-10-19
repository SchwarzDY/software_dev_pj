import { Group } from "./Group";
import type { Shape } from "./Shape";
import { EditorError } from "./EditorError";

/** 当前文档：画布尺寸 + 内部根容器 + id → 图形索引（id 唯一性的执行者）。 */
export class Document {
  width: number;
  height: number;
  readonly root: Group;
  private readonly byId = new Map<string, Shape>();

  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.root = new Group("(root)"); // 内部根容器：不显示、不序列化、不入索引
  }

  get(id: string): Shape | undefined {
    return this.byId.get(id);
  }

  require(id: string): Shape {
    const s = this.byId.get(id);
    if (s === undefined) throw new EditorError(`no such shape: ${id}`);
    return s;
  }

  /** 登记 id（create/group 命令在全部校验通过后的最后一步调用）。 */
  register(shape: Shape): void {
    if (this.byId.has(shape.id)) throw new EditorError(`id already exists: ${shape.id}`);
    this.byId.set(shape.id, shape);
  }

  /** 摘除 id；容器连带其全部子孙一并出索引（delete 容器时索引保持一致）。 */
  unregister(shape: Shape): void {
    this.byId.delete(shape.id);
    if (shape instanceof Group) {
      for (const d of shape.descendants()) this.byId.delete(d.id);
    }
  }

  /** save / read 反馈里的 "(N elements)" 计数，含容器。 */
  countElements(): number {
    return this.byId.size;
  }
}
