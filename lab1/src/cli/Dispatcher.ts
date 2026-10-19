import { Document } from "../domain/Document";
import { EditorError } from "../domain/EditorError";
import { fmtNum, parseNum } from "../domain/num";
import { History } from "../commands/History";
import type { Command } from "../commands/Command";
import { CreateCommand } from "../commands/CreateCommand";
import { DeleteCommand } from "../commands/DeleteCommand";
import { MoveCommand } from "../commands/MoveCommand";
import { ScaleCommand } from "../commands/ScaleCommand";
import { SetCommand } from "../commands/SetCommand";
import { GroupCommand } from "../commands/GroupCommand";
import { UngroupCommand } from "../commands/UngroupCommand";
import { AddToCommand } from "../commands/AddToCommand";
import { FrontCommand } from "../commands/FrontCommand";
import { BackCommand } from "../commands/BackCommand";
import { Tokenizer } from "./Tokenizer";
import { TreePrinter } from "./TreePrinter";
import { helpText } from "./help";
import { SvgParser } from "../io/SvgParser";
import { SvgWriter } from "../io/SvgWriter";

type Handler = (args: string[]) => string[];

/**
 * 命令分发（名字分派点②，规范允许且须标注待重构的两处之一）：
 * 命令名 → 处理函数的表。待重构：未来 agent / GUI 通道直接构造 Command 对象，
 * 绕过此表；表退化为 CLI 语法糖。
 */
export class Dispatcher {
  private doc: Document | null = null;
  private readonly history = new History();
  private lastPath: string | null = null;
  private readonly handlers: ReadonlyMap<string, Handler>;

  constructor() {
    const table = new Map<string, Handler>();
    table.set("init", (a) => this.init(a));
    table.set("read", (a) => this.read(a));
    table.set("save", (a) => this.save(a));
    table.set("canvas", (a) => this.canvas(a));
    table.set("create", (a) => this.create(a));
    table.set("delete", (a) => {
      this.exactArgs(a, 1, "delete <id>");
      return this.edit(new DeleteCommand(this.requireDoc(), a[0]));
    });
    table.set("move", (a) => {
      this.exactArgs(a, 3, "move <id> <dx> <dy>");
      return this.edit(new MoveCommand(this.requireDoc(), a[0], parseNum(a[1]), parseNum(a[2])));
    });
    table.set("scale", (a) => {
      this.exactArgs(a, 2, "scale <id> <factor>");
      return this.edit(new ScaleCommand(this.requireDoc(), a[0], parseNum(a[1])));
    });
    table.set("set", (a) => {
      this.exactArgs(a, 3, "set <id> <attr> <value>");
      return this.edit(new SetCommand(this.requireDoc(), a[0], a[1], a[2]));
    });
    table.set("group", (a) => {
      if (a.length < 2) throw new EditorError("usage: group <newGid> <id1> <id2> …");
      return this.edit(new GroupCommand(this.requireDoc(), a[0], a.slice(1)));
    });
    table.set("ungroup", (a) => {
      this.exactArgs(a, 1, "ungroup <gid>");
      return this.edit(new UngroupCommand(this.requireDoc(), a[0]));
    });
    table.set("addto", (a) => {
      this.exactArgs(a, 2, "addto <gid> <id>");
      return this.edit(new AddToCommand(this.requireDoc(), a[0], a[1]));
    });
    table.set("front", (a) => {
      this.exactArgs(a, 1, "front <id>");
      return this.edit(new FrontCommand(this.requireDoc(), a[0]));
    });
    table.set("back", (a) => {
      this.exactArgs(a, 1, "back <id>");
      return this.edit(new BackCommand(this.requireDoc(), a[0]));
    });
    table.set("tree", (a) => this.tree(a));
    table.set("show", (a) => this.show(a));
    table.set("undo", () => [this.requireDocAndHistory().undo()]);
    table.set("redo", () => [this.requireDocAndHistory().redo()]);
    table.set("help", () => helpText());
    this.handlers = table;
  }

  /** 执行一行输入，返回应打印的行；错误统一转为 "error: …" 单行输出。 */
  execute(line: string): string[] {
    const text = line.trim();
    if (text === "" || text.startsWith("#")) return [];
    try {
      const tokens = Tokenizer.tokenize(text);
      const name = tokens[0] ?? "";
      const handler = this.handlers.get(name);
      if (handler === undefined) return [`error: unknown command: ${name} (type 'help')`];
      return handler(tokens.slice(1));
    } catch (e) {
      return [`error: ${(e as Error).message}`];
    }
  }

  private requireDoc(): Document {
    if (this.doc === null) throw new EditorError("no document. use 'init' or 'read' first");
    return this.doc;
  }

  private requireDocAndHistory(): History {
    this.requireDoc();
    return this.history;
  }

  private edit(cmd: Command): string[] {
    const feedback = cmd.execute();
    this.history.record(cmd);
    return [feedback];
  }

  /** 参数个数精确校验；不符抛 usage 错误（裁定 D16）。 */
  private exactArgs(args: string[], count: number, usage: string): boolean {
    if (args.length !== count) throw new EditorError(`usage: ${usage}`);
    return true;
  }

  private init(args: string[]): string[] {
    let w = 800;
    let h = 600;
    if (args.length > 0) {
      this.exactArgs(args, 2, "init [w] [h]");
      w = parseNum(args[0]);
      h = parseNum(args[1]);
    }
    if (w <= 0 || h <= 0) throw new EditorError("canvas size must be positive");
    this.doc = new Document(w, h);
    this.history.reset();
    this.lastPath = null;
    return [`canvas ${fmtNum(w)}x${fmtNum(h)} created`];
  }

  private read(args: string[]): string[] {
    this.exactArgs(args, 1, "read <file.svg>");
    const result = SvgParser.readFile(args[0]); // 失败时当前文档保持不变
    this.doc = result.doc;
    this.history.reset();
    this.lastPath = args[0];
    return [...result.warnings, `read ${args[0]} (${result.doc.countElements()} elements)`];
  }

  private save(args: string[]): string[] {
    const doc = this.requireDoc();
    if (args.length > 1) throw new EditorError("usage: save [file.svg]");
    const path = args.length === 1 ? args[0] : this.lastPath;
    if (path === null) throw new EditorError("no file specified");
    SvgWriter.write(doc, path);
    this.history.lockIo();
    return [`saved to ${path} (${doc.countElements()} elements)`];
  }

  private canvas(args: string[]): string[] {
    const doc = this.requireDoc();
    if (args.length === 0) return [`canvas ${fmtNum(doc.width)}x${fmtNum(doc.height)}`];
    this.exactArgs(args, 2, "canvas [w] [h]");
    const w = parseNum(args[0]);
    const h = parseNum(args[1]);
    if (w <= 0 || h <= 0) throw new EditorError("canvas size must be positive");
    doc.width = w;
    doc.height = h;
    this.history.lockIo();
    return [`canvas set to ${fmtNum(w)}x${fmtNum(h)}`];
  }

  private create(args: string[]): string[] {
    const doc = this.requireDoc();
    let rest = args;
    let containerId: string | undefined;
    if (rest.length >= 4 && rest[rest.length - 2] === "in") {
      containerId = rest[rest.length - 1];
      rest = rest.slice(0, -2);
    }
    if (rest.length < 2) throw new EditorError("usage: create <type> <id> [params…] [in <containerId>]");
    return this.edit(new CreateCommand(doc, rest[0], rest[1], rest.slice(2), containerId));
  }

  private tree(args: string[]): string[] {
    const doc = this.requireDoc();
    if (args.length === 0) return TreePrinter.printDocument(doc);
    this.exactArgs(args, 1, "tree [id]");
    return TreePrinter.printSubtree(doc.require(args[0]));
  }

  private show(args: string[]): string[] {
    const doc = this.requireDoc();
    this.exactArgs(args, 1, "show <id>");
    const shape = doc.require(args[0]);
    const parent = shape.parent === doc.root ? "svg" : (shape.parent?.ref() ?? "?");
    const lines = [`${shape.ref()}  parent=${parent}`];
    const geometry = shape.geometryLine();
    if (geometry !== undefined) lines.push(geometry);
    lines.push(...shape.appearanceLines());
    return lines;
  }
}
