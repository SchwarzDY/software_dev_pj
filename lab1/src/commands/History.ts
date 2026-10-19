import { EditorError } from "../domain/EditorError";
import type { Command } from "./Command";

/**
 * undo / redo 双栈 + IO 锁（裁定 D1）：
 * 文档类命令（init/read/save、canvas 改尺寸）执行后禁止 undo/redo，
 * 直至下一条成功执行的编辑命令；新编辑会清空 redo 栈。
 */
export class History {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private ioLocked = false;

  /** 编辑命令成功执行后调用：压栈、清空 redo 栈、解除 IO 锁。 */
  record(cmd: Command): void {
    this.undoStack.push(cmd);
    this.redoStack.length = 0;
    this.ioLocked = false;
  }

  /** save / canvas 改尺寸后调用：只上锁，不清栈（旧命令引用的图形仍有效）。 */
  lockIo(): void {
    this.ioLocked = true;
  }

  /** init / read 替换整个文档后调用：清空双栈并上锁（旧命令引用已失效）。 */
  reset(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.ioLocked = true;
  }

  undo(): string {
    this.assertNotLocked();
    const cmd = this.undoStack.pop();
    if (cmd === undefined) throw new EditorError("nothing to undo");
    const feedback = cmd.undo();
    this.redoStack.push(cmd);
    return feedback;
  }

  redo(): string {
    this.assertNotLocked();
    const cmd = this.redoStack.pop();
    if (cmd === undefined) throw new EditorError("nothing to redo");
    const feedback = cmd.execute();
    this.undoStack.push(cmd);
    return feedback;
  }

  private assertNotLocked(): void {
    if (this.ioLocked) throw new EditorError("undo not allowed after io command");
  }
}
