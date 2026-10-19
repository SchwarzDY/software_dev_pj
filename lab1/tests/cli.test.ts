import test from "node:test";
import assert from "node:assert/strict";

import { Dispatcher } from "../src/cli/Dispatcher";
import { Tokenizer } from "../src/cli/Tokenizer";

function repl(): { d: Dispatcher; out: (line: string) => string[] } {
  const d = new Dispatcher();
  return { d, out: (line) => d.execute(line) };
}

test("未 init/read 前执行其他命令：规范原文错误", () => {
  const { out } = repl();
  assert.deepEqual(out("create rect r 0 0 10 10"), ["error: no document. use 'init' or 'read' first"]);
  assert.deepEqual(out("tree"), ["error: no document. use 'init' or 'read' first"]);
  assert.deepEqual(out("undo"), ["error: no document. use 'init' or 'read' first"]);
});

test("init 与 canvas：新建、显示、修改尺寸与 IO 锁（裁定 D15）", () => {
  const { out } = repl();
  assert.deepEqual(out("init 400 200"), ["canvas 400x200 created"]);
  assert.deepEqual(out("init"), ["canvas 800x600 created"]);
  assert.deepEqual(out("canvas"), ["canvas 800x600"]);
  assert.deepEqual(out("canvas 1024 768"), ["canvas set to 1024x768"]);
  assert.deepEqual(out("undo"), ["error: undo not allowed after io command"]);
});

test("规范 5.1 会话：create/group 后 tree 输出逐字一致", () => {
  const { out } = repl();
  assert.deepEqual(out("init 800 600"), ["canvas 800x600 created"]);
  assert.deepEqual(out("create rect bg 0 0 800 600 #ffffff"), ["rect#bg created"]);
  assert.deepEqual(out('create text title 20 40 "My Diagram"'), ["text#title created"]);
  assert.deepEqual(out("create circle c1 100 100 20 red"), ["circle#c1 created"]);
  assert.deepEqual(out("create rect box 200 80 60 60 #3366ff"), ["rect#box created"]);
  assert.deepEqual(out("group markers c1 box"), ["g#markers created with 2 children"]);

  assert.deepEqual(out("tree"), [
    "svg (800x600)",
    "├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff",
    "├── text#title     (20,40) \"My Diagram\"",
    "└── g#markers",
    "    ├── circle#c1  cx=100 cy=100 r=20 fill=red",
    "    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
  ]);

  assert.deepEqual(out("tree markers"), [
    "g#markers",
    "├── circle#c1  cx=100 cy=100 r=20 fill=red",
    "└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
  ]);
});

test("show：属性明细格式与规范 5.2 一致", () => {
  const { out } = repl();
  out("init 800 600");
  out("create circle c1 100 100 20 red");
  out("create g markers");
  out("addto markers c1");
  assert.deepEqual(out("show c1"), ["circle#c1  parent=g#markers", "  cx=100 cy=100 r=20", "  fill=red"]);
});

test("move/undo/redo 经分发器：反馈与规范第 6 节一致", () => {
  const { out } = repl();
  out("init 800 600");
  out("create circle c1 100 100 20 red");
  assert.deepEqual(out("move c1 30 0"), ["circle#c1 moved to (130,100)"]);
  assert.deepEqual(out("undo"), ["circle#c1 moved back to (100,100)"]);
  assert.deepEqual(out("redo"), ["circle#c1 moved to (130,100)"]);
});

test("set 带引号值与 in 子句经分词器", () => {
  const { out } = repl();
  out("init 800 600");
  out('create text title 20 40 "My Diagram"');
  assert.deepEqual(out('set title text "My Diagram v2"'), ['text#title updated: text="My Diagram v2"']);
  assert.deepEqual(out("undo"), ['text#title updated: text="My Diagram"']);

  out("create g flow");
  out("create rect start 120 100 160 60 #4a90d9 in flow");
  assert.deepEqual(out("tree flow"), [
    "g#flow",
    "└── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9",
  ]);
});

test("空行 / 注释 / 未知命令", () => {
  const { out } = repl();
  assert.deepEqual(out(""), []);
  assert.deepEqual(out("# 这是一段注释"), []);
  assert.deepEqual(out("frobnicate x"), ["error: unknown command: frobnicate (type 'help')"]);
});

test("分词器：引号包裹与未闭合引号", () => {
  assert.deepEqual(Tokenizer.tokenize('create text t 1 2 "hello world"'), [
    "create",
    "text",
    "t",
    "1",
    "2",
    "hello world",
  ]);
  assert.throws(() => Tokenizer.tokenize('set t text "oops'), /unterminated quote/);
});

test("help：列出全部命令", () => {
  const { out } = repl();
  const help = out("help").join("\n");
  for (const name of ["init", "read", "save", "canvas", "create", "delete", "move", "scale", "set",
    "group", "ungroup", "addto", "front", "back", "tree", "show", "undo", "redo", "quit"]) {
    assert.ok(help.includes(name), `help 应包含 ${name}`);
  }
});
