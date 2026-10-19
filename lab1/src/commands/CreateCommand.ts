import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import { EditorError } from "../domain/EditorError";
import { ShapeFactory } from "../domain/ShapeFactory";
import type { Shape } from "../domain/Shape";
import type { Command } from "./Command";

/** create <type> <id> [params…] [in <containerId>] */
export class CreateCommand implements Command {
  private readonly doc: Document;
  private readonly type: string;
  private readonly id: string;
  private readonly args: string[];
  private readonly containerId: string | undefined;
  private shape?: Shape;
  private container?: Group;

  constructor(doc: Document, type: string, id: string, args: string[], containerId?: string) {
    this.doc = doc;
    this.type = type;
    this.id = id;
    this.args = args;
    this.containerId = containerId;
  }

  execute(): string {
    if (this.doc.get(this.id) !== undefined) throw new EditorError(`id already exists: ${this.id}`);
    const container = this.resolveContainer();
    // 工厂负责参数校验（个数 / 数字）；此时尚未产生任何变更
    const shape = ShapeFactory.create(this.type, this.id, this.args);
    container.appendChild(shape);
    this.doc.register(shape);
    this.shape = shape;
    this.container = container;
    return container === this.doc.root ? `${shape.ref()} created` : `${shape.ref()} created in ${container.ref()}`;
  }

  undo(): string {
    const shape = this.shape;
    const container = this.container;
    if (shape === undefined || container === undefined) throw new Error("undo before execute");
    container.removeChild(shape);
    this.doc.unregister(shape);
    return `${shape.ref()} removed`;
  }

  private resolveContainer(): Group {
    if (this.containerId === undefined) return this.doc.root;
    const target = this.doc.get(this.containerId);
    if (target === undefined) throw new EditorError(`no such container: ${this.containerId}`);
    if (!(target instanceof Group)) throw new EditorError(`not a container: ${this.containerId}`);
    return target;
  }
}
