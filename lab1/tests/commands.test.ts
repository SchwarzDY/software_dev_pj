import test from "node:test";
import assert from "node:assert/strict";

import { Document } from "../src/domain/Document";
import { Group } from "../src/domain/Group";
import { History } from "../src/commands/History";
import type { Command } from "../src/commands/Command";
import { CreateCommand } from "../src/commands/CreateCommand";
import { DeleteCommand } from "../src/commands/DeleteCommand";
import { MoveCommand } from "../src/commands/MoveCommand";
import { ScaleCommand } from "../src/commands/ScaleCommand";
import { SetCommand } from "../src/commands/SetCommand";
import { GroupCommand } from "../src/commands/GroupCommand";
import { UngroupCommand } from "../src/commands/UngroupCommand";
import { AddToCommand } from "../src/commands/AddToCommand";
import { FrontCommand } from "../src/commands/FrontCommand";
import { BackCommand } from "../src/commands/BackCommand";

function newSession(): { doc: Document; history: History } {
  return { doc: new Document(800, 600), history: new History() };
}

/** 模拟分发器行为：执行成功才入历史栈。 */
function run(doc: Document, history: History, cmd: Command): string {
  const feedback = cmd.execute();
  history.record(cmd);
  return feedback;
}

function ids(shapes: { id: string }[]): string[] {
  return shapes.map((s) => s.id);
}

test("create：反馈文案、in 子句、undo/redo 往返", () => {
  const { doc, history } = newSession();
  assert.equal(run(doc, history, new CreateCommand(doc, "g", "node1", [])), "g#node1 created");
  const fb = run(
    doc,
    history,
    new CreateCommand(doc, "rect", "start", ["120", "100", "160", "60", "#4a90d9"], "node1")
  );
  assert.equal(fb, "rect#start created in g#node1");
  assert.equal(doc.countElements(), 2);

  assert.equal(history.undo(), "rect#start removed");
  assert.equal(doc.countElements(), 1);
  assert.equal(history.redo(), "rect#start created in g#node1");
  assert.equal(doc.countElements(), 2);
});

test("create 错误：id 重复 / 容器不存在 / 目标不是容器，且状态不变", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "rect", "r1", ["0", "0", "10", "10"]));
  assert.throws(() => new CreateCommand(doc, "rect", "r1", ["0", "0", "1", "1"]).execute(), /id already exists: r1/);
  assert.throws(
    () => new CreateCommand(doc, "rect", "r2", ["0", "0", "1", "1"], "nope").execute(),
    /no such container: nope/
  );
  assert.throws(
    () => new CreateCommand(doc, "rect", "r3", ["0", "0", "1", "1"], "r1").execute(),
    /not a container: r1/
  );
  assert.equal(doc.countElements(), 1);
});

test("delete 容器：子孙一并出索引；undo 整树恢复到原位置", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "g", "g1", []));
  run(doc, history, new CreateCommand(doc, "rect", "r", ["1", "2", "3", "4"], "g1"));
  run(doc, history, new CreateCommand(doc, "text", "t", ["5", "6", "hi"], "g1"));
  assert.equal(doc.countElements(), 3);

  assert.equal(run(doc, history, new DeleteCommand(doc, "g1")), "g#g1 deleted");
  assert.equal(doc.countElements(), 0);
  assert.throws(() => doc.require("r"), /no such shape: r/);

  assert.equal(history.undo(), "g#g1 restored into svg");
  assert.equal(doc.countElements(), 3);
  const g1 = doc.require("g1");
  assert.ok(g1 instanceof Group);
  assert.equal(g1.children.length, 2);
  assert.equal(doc.root.children[0], g1);
});

test("move：叶子报新位置、容器报增量，undo 文案与规范第 6 节一致", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "circle", "c1", ["100", "100", "20", "red"]));
  assert.equal(run(doc, history, new MoveCommand(doc, "c1", 30, 0)), "circle#c1 moved to (130,100)");
  assert.equal(history.undo(), "circle#c1 moved back to (100,100)");

  run(doc, history, new CreateCommand(doc, "g", "node2", []));
  assert.equal(run(doc, history, new MoveCommand(doc, "node2", 0, 100)), "g#node2 moved by (0,100)");
  assert.equal(history.undo(), "g#node2 moved back by (0,-100)");
});

test("scale：非正数拒绝；undo 用倒数还原", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "rect", "r1", ["10", "20", "100", "50"]));
  assert.throws(() => new ScaleCommand(doc, "r1", 0).execute(), /scale factor must be positive/);

  assert.equal(run(doc, history, new ScaleCommand(doc, "r1", 2)), "rect#r1 scaled by 2");
  const r = doc.require("r1");
  assert.equal(r.getAttributeText("width"), "200");

  assert.equal(history.undo(), "rect#r1 scaled back by 0.5");
  assert.equal(r.getAttributeText("width"), "100");
});

test("set：文案、undo 还原旧值、原先未设置的外观属性清除", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "text", "title", ["20", "40", "My Diagram"]));
  assert.equal(
    run(doc, history, new SetCommand(doc, "title", "text", "My Diagram v2")),
    'text#title updated: text="My Diagram v2"'
  );
  assert.equal(history.undo(), 'text#title updated: text="My Diagram"');

  run(doc, history, new CreateCommand(doc, "rect", "r1", ["0", "0", "10", "10"]));
  run(doc, history, new SetCommand(doc, "r1", "fill", "red"));
  assert.equal(doc.require("r1").fill, "red");
  history.undo();
  assert.equal(doc.require("r1").fill, undefined);

  assert.throws(() => new SetCommand(doc, "r1", "glow", "yes").execute(), /unknown attribute: glow/);
});

/** 规范第 6 节 transcript 的前置状态：bg / title / c1 / box 四个顶层图形。 */
function buildTranscriptDoc(): { doc: Document; history: History } {
  const s = newSession();
  run(s.doc, s.history, new CreateCommand(s.doc, "rect", "bg", ["0", "0", "800", "600", "#ffffff"]));
  run(s.doc, s.history, new CreateCommand(s.doc, "text", "title", ["20", "40", "My Diagram"]));
  run(s.doc, s.history, new CreateCommand(s.doc, "circle", "c1", ["100", "100", "20", "red"]));
  run(s.doc, s.history, new CreateCommand(s.doc, "rect", "box", ["200", "80", "60", "60", "#3366ff"]));
  return s;
}

test("group：反馈、成员顺序、D7 插入位置、undo 完整还原", () => {
  const { doc, history } = buildTranscriptDoc();
  assert.equal(
    run(doc, history, new GroupCommand(doc, "markers", ["c1", "box"])),
    "g#markers created with 2 children"
  );
  assert.deepEqual(ids(doc.root.children), ["bg", "title", "markers"]);
  const markers = doc.require("markers");
  assert.ok(markers instanceof Group);
  assert.deepEqual(ids(markers.children), ["c1", "box"]);

  assert.equal(history.undo(), "g#markers removed, 2 shapes restored");
  assert.deepEqual(ids(doc.root.children), ["bg", "title", "c1", "box"]);
  assert.equal(doc.countElements(), 4); // 成员 id 不因 undo 丢失
});

test("group 错误：容器与子孙同组（点名容器）、含不存在 id 时整体不变", () => {
  const { doc, history } = buildTranscriptDoc();
  run(doc, history, new GroupCommand(doc, "markers", ["c1", "box"]));
  assert.throws(
    () => new GroupCommand(doc, "bad", ["c1", "markers"]).execute(),
    /cannot group a container into its own descendant: markers/
  );
  assert.throws(() => new GroupCommand(doc, "bad2", ["c1", "ghost"]).execute(), /no such shape: ghost/);
  assert.equal(doc.countElements(), 5); // markers 仍在，无任何变更
});

test("ungroup：子图形提升到原位置；根级与非容器报错；undo 还原", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "g", "flow", []));
  run(doc, history, new CreateCommand(doc, "g", "node", [], "flow"));
  run(doc, history, new CreateCommand(doc, "rect", "r", ["1", "2", "3", "4"], "node"));
  run(doc, history, new CreateCommand(doc, "text", "t", ["5", "6", "hi"], "node"));

  assert.equal(run(doc, history, new UngroupCommand(doc, "node")), "g#node ungrouped, 2 children promoted");
  const flow = doc.require("flow");
  assert.ok(flow instanceof Group);
  assert.deepEqual(ids(flow.children), ["r", "t"]);
  assert.equal(doc.countElements(), 3);

  assert.throws(() => new UngroupCommand(doc, "flow").execute(), /cannot ungroup top-level container: flow/);
  assert.throws(() => new UngroupCommand(doc, "r").execute(), /not a container: r/);

  assert.equal(history.undo(), "g#node restored");
  assert.deepEqual(ids(flow.children), ["node"]);
  assert.equal(doc.countElements(), 4);
});

test("addto：移入容器末尾、undo 还原原位、环检测（裁定 D13）", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "g", "g1", []));
  run(doc, history, new CreateCommand(doc, "rect", "r1", ["0", "0", "10", "10"]));
  run(doc, history, new CreateCommand(doc, "rect", "r2", ["1", "1", "10", "10"]));

  assert.equal(run(doc, history, new AddToCommand(doc, "g1", "r2")), "rect#r2 added to g#g1");
  const g1 = doc.require("g1");
  assert.ok(g1 instanceof Group);
  assert.deepEqual(ids(g1.children), ["r2"]);
  history.undo();
  assert.deepEqual(ids(doc.root.children), ["g1", "r1", "r2"]);

  run(doc, history, new CreateCommand(doc, "g", "inner", [], "g1"));
  assert.throws(
    () => new AddToCommand(doc, "inner", "g1").execute(),
    /cannot move a container into its own descendant: g1/
  );
  assert.throws(
    () => new AddToCommand(doc, "g1", "g1").execute(),
    /cannot move a container into its own descendant: g1/
  );
});

test("front / back：同级 z-order 调整与还原", () => {
  const { doc, history } = newSession();
  for (const id of ["a", "b", "c"]) {
    run(doc, history, new CreateCommand(doc, "rect", id, ["0", "0", "1", "1"]));
  }
  assert.equal(run(doc, history, new FrontCommand(doc, "a")), "rect#a moved to front");
  assert.deepEqual(ids(doc.root.children), ["b", "c", "a"]);
  assert.equal(history.undo(), "rect#a z-order restored");
  assert.deepEqual(ids(doc.root.children), ["a", "b", "c"]);

  assert.equal(run(doc, history, new BackCommand(doc, "c")), "rect#c moved to back");
  assert.deepEqual(ids(doc.root.children), ["c", "a", "b"]);
  history.undo();
  assert.deepEqual(ids(doc.root.children), ["a", "b", "c"]);
});

test("History：IO 锁、编辑解禁、redo 清空、reset（裁定 D1/D11）", () => {
  const { doc, history } = newSession();
  run(doc, history, new CreateCommand(doc, "rect", "r1", ["0", "0", "1", "1"]));

  history.lockIo();
  assert.throws(() => history.undo(), /undo not allowed after io command/);
  assert.throws(() => history.redo(), /undo not allowed after io command/);

  run(doc, history, new MoveCommand(doc, "r1", 1, 0)); // 编辑命令解禁
  assert.doesNotThrow(() => history.undo());
  history.redo();

  run(doc, history, new MoveCommand(doc, "r1", 2, 0)); // 新编辑清空 redo 栈
  assert.throws(() => history.redo(), /nothing to redo/);

  history.reset(); // init/read：清栈并上锁
  assert.throws(() => history.undo(), /undo not allowed after io command/);
});
