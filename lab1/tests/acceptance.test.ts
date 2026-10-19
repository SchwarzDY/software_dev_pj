import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Dispatcher } from "../src/cli/Dispatcher";

const labRoot = join(import.meta.dirname, "..");
const otherSvg = join(import.meta.dirname, "fixtures", "other.svg").replace(/\\/g, "/");
const tmp = mkdtempSync(join(tmpdir(), "svg-accept-")).replace(/\\/g, "/");

test("规范第 6 节主会话：完整回放，逐行一致", () => {
  const d = new Dispatcher();
  const out = (line: string) => d.execute(line);

  assert.deepEqual(out("init 800 600"), ["canvas 800x600 created"]);
  assert.deepEqual(out("create rect bg 0 0 800 600 #ffffff"), ["rect#bg created"]);
  assert.deepEqual(out('create text title 20 40 "My Diagram"'), ["text#title created"]);
  assert.deepEqual(out("create circle c1 100 100 20 red"), ["circle#c1 created"]);
  assert.deepEqual(out("create rect box 200 80 60 60 #3366ff"), ["rect#box created"]);

  assert.deepEqual(out("group markers c1 box"), ["g#markers created with 2 children"]);
  assert.deepEqual(out("tree"), [
    "svg (800x600)",
    "├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff",
    '├── text#title     (20,40) "My Diagram"',
    "└── g#markers",
    "    ├── circle#c1  cx=100 cy=100 r=20 fill=red",
    "    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
  ]);

  assert.deepEqual(out("move c1 30 0"), ["circle#c1 moved to (130,100)"]);
  assert.deepEqual(out("undo"), ["circle#c1 moved back to (100,100)"]);
  assert.deepEqual(out("redo"), ["circle#c1 moved to (130,100)"]);

  assert.deepEqual(out('set title text "My Diagram v2"'), ['text#title updated: text="My Diagram v2"']);
  assert.deepEqual(out("undo"), ['text#title updated: text="My Diagram"']);

  assert.deepEqual(out("group bad c1 markers"), [
    "error: cannot group a container into its own descendant: markers",
  ]);
  assert.deepEqual(out("delete box"), ["rect#box deleted"]);
  assert.deepEqual(out("undo"), ["rect#box restored into g#markers"]);

  assert.deepEqual(out(`save ${tmp}/demo.svg`), [`saved to ${tmp}/demo.svg (5 elements)`]);
  assert.deepEqual(out("undo"), ["error: undo not allowed after io command"]);

  assert.deepEqual(out(`read ${otherSvg}`), [
    "warning: assigned id rect1 to unnamed <rect>",
    `read ${otherSvg} (7 elements)`,
  ]);
  assert.deepEqual(out("tree"), [
    "svg (400x300)",
    "├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff",
    '├── text#t1        (10,290) "imported"',
    "├── circle#c1      cx=50 cy=50 r=10",
    "├── g#g1",
    "│   ├── rect#r2    x=0 y=0 w=10 h=10",
    "│   └── circle#c2  cx=5 cy=5 r=2",
    "└── ellipse#e1     cx=1 cy=2 rx=3 ry=4",
  ]);
});

test("规范 6.1 版本 A 会话（两节点流程图）：完整回放", () => {
  const d = new Dispatcher();
  const out = (line: string) => d.execute(line);

  assert.deepEqual(out("init 800 600"), ["canvas 800x600 created"]);
  assert.deepEqual(out("create g flowchart"), ["g#flowchart created"]);
  assert.deepEqual(out("create g node1 in flowchart"), ["g#node1 created in g#flowchart"]);
  assert.deepEqual(out("create rect start 120 100 160 60 #4a90d9 in node1"), ["rect#start created in g#node1"]);
  assert.deepEqual(out('create text start-label 155 135 "开始" in node1'), ["text#start-label created in g#node1"]);
  assert.deepEqual(out("create g node2 in flowchart"), ["g#node2 created in g#flowchart"]);
  assert.deepEqual(out("create rect process 520 100 160 60 #f5a623 in node2"), ["rect#process created in g#node2"]);
  assert.deepEqual(out('create text process-label 545 135 "处理数据" in node2'), [
    "text#process-label created in g#node2",
  ]);
  assert.deepEqual(out("create line arrow1 280 130 520 130 black in flowchart"), [
    "line#arrow1 created in g#flowchart",
  ]);

  assert.deepEqual(out("tree"), [
    "svg (800x600)",
    "└── g#flowchart",
    "    ├── g#node1",
    "    │   ├── rect#start          x=120 y=100 w=160 h=60 fill=#4a90d9",
    '    │   └── text#start-label    (155,135) "开始"',
    "    ├── g#node2",
    "    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623",
    '    │   └── text#process-label  (545,135) "处理数据"',
    "    └── line#arrow1             (280,130) -> (520,130) stroke=black",
  ]);

  assert.deepEqual(out("move node2 0 100"), ["g#node2 moved by (0,100)"]);
  assert.deepEqual(out("undo"), ["g#node2 moved back by (0,-100)"]);
  assert.deepEqual(out('set process-label text "处理数据 v2"'), ['text#process-label updated: text="处理数据 v2"']);

  assert.deepEqual(out(`save ${tmp}/flowchart.svg`), [`saved to ${tmp}/flowchart.svg (8 elements)`]);
});

test("规范 4.2 错误信息表：逐条一致", () => {
  const d = new Dispatcher();
  const out = (line: string) => d.execute(line);

  assert.deepEqual(out("tree"), ["error: no document. use 'init' or 'read' first"]);
  out("init 800 600");
  out("create rect r1 0 0 10 10");

  assert.deepEqual(out("create circle r1 0 0 5"), ["error: id already exists: r1"]);
  assert.deepEqual(out("move r9 1 2"), ["error: no such shape: r9"]);
  assert.deepEqual(out("create rect r2 0 0 1 1 in node9"), ["error: no such container: node9"]);
  assert.deepEqual(out("create circle c 1 1 1 in r1"), ["error: not a container: r1"]);
  assert.deepEqual(out("create hexagon h 1 2"), ["error: unknown shape type: hexagon (is the plugin loaded?)"]);
  // box 属插件阶段类型，本阶段同样报 unknown shape type
  assert.deepEqual(out('create box n1 1 2 3 4 "x"'), ["error: unknown shape type: box (is the plugin loaded?)"]);

  out("create g scene");
  out("create g sub in scene");
  assert.deepEqual(out("group bad sub scene"), [
    "error: cannot group a container into its own descendant: scene",
  ]);
  assert.deepEqual(out("ungroup scene"), ["error: cannot ungroup top-level container: scene"]);
  // 注：`ungroup 复合图形`（box）一行本阶段无插件类型可触发，留待插件阶段验证

  assert.deepEqual(out("scale r1 0"), ["error: scale factor must be positive"]);
  assert.deepEqual(out("read no-such.svg"), ["error: cannot read file: no-such.svg"]);
  assert.deepEqual(out(`save ${tmp}/no-such-dir/x.svg`), [`error: cannot write file: ${tmp}/no-such-dir/x.svg`]);
});

test("脚本回放：# 注释脚本经真实 CLI 管道执行（通用约定第 1 条）", () => {
  const script = [
    "# 规范 2：命令序列可存成脚本回放",
    "init 400 200",
    "create rect start 30 70 120 60 #4a90d9",
    "",
    "tree",
    "quit",
  ].join("\n");

  const proc = spawnSync(process.execPath, ["--import", "tsx", join(labRoot, "src", "cli", "main.ts")], {
    input: script,
    encoding: "utf8",
    cwd: labRoot,
  });
  assert.equal(proc.status, 0);

  const lines = (proc.stdout ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/svg> /g, ""))
    .filter((l) => l !== "" && l !== "bye" && !l.startsWith("svg-editor 0.1"));

  assert.deepEqual(lines, [
    "canvas 400x200 created",
    "rect#start created",
    "svg (400x200)",
    "└── rect#start  x=30 y=70 w=120 h=60 fill=#4a90d9",
  ]);
});
