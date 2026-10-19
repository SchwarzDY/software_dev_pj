import { Document } from "../domain/Document";
import type { Command } from "./Command";

/**
 * set <id> <attr> <value>：白名单由图形自身校验；
 * undo 读取执行前的旧值还原，原先未设置的外观属性则清除。
 */
export class SetCommand implements Command {
  private readonly doc: Document;
  private readonly id: string;
  private readonly attr: string;
  private readonly value: string;
  private oldValue?: string;

  constructor(doc: Document, id: string, attr: string, value: string) {
    this.doc = doc;
    this.id = id;
    this.attr = attr;
    this.value = value;
  }

  execute(): string {
    const shape = this.doc.require(this.id);
    const old = shape.getAttributeText(this.attr); // 属性不合法在此抛错，此时未产生任何变更
    shape.setAttribute(this.attr, this.value);
    this.oldValue = old;
    return `${shape.ref()} updated: ${this.attr}=${this.display(this.value)}`;
  }

  undo(): string {
    const shape = this.doc.require(this.id);
    if (this.oldValue === undefined) shape.clearAttribute(this.attr);
    else shape.setAttribute(this.attr, this.oldValue);
    const restored = this.oldValue === undefined ? "(unset)" : this.display(this.oldValue);
    return `${shape.ref()} updated: ${this.attr}=${restored}`;
  }

  /** 文本内容按规范示例带引号回显（text="…"），其余属性原样。 */
  private display(value: string): string {
    return this.attr === "text" ? `"${value}"` : value;
  }
}
