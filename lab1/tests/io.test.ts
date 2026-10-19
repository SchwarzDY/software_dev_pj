import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Dispatcher } from "../src/cli/Dispatcher";
import { Document } from "../src/domain/Document";
import { Group } from "../src/domain/Group";
import { Rect } from "../src/domain/Rect";
import { Line } from "../src/domain/Line";
import { SvgWriter } from "../src/io/SvgWriter";
import { SvgParser } from "../src/io/SvgParser";

const fixtureDir = join(import.meta.dirname, "fixtures");
const otherSvg = join(fixtureDir, "other.svg");

function repl(): { d: Dispatcher; out: (line: string) => string[] } {
  const d = new Dispatcher();
  return { d, out: (line) => d.execute(line) };
}

test("read other.svg：警告、计数与 tree 输出和规范第 6 节逐字一致", () => {
  const { out } = repl();
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

test("read 失败：文件不存在，当前文档不变", () => {
  const { out } = repl();
  out("init 800 600");
  assert.deepEqual(out("read no-such-file.svg"), ["error: cannot read file: no-such-file.svg"]);
  assert.deepEqual(out("canvas"), ["canvas 800x600"]);
});

test("save 无参数且从未 read：no file specified（裁定 D4）", () => {
  const { out } = repl();
  out("init 800 600");
  assert.deepEqual(out("save"), ["error: no file specified"]);
});

test("SvgWriter 输出与规范第 0.1 节示例逐字一致", () => {
  const doc = new Document(400, 200);
  const g = new Group("flow");
  doc.root.appendChild(g);
  doc.register(g);
  const rect = new Rect("start", 30, 70, 120, 60, "#4a90d9");
  g.appendChild(rect);
  doc.register(rect);
  const line = new Line("edge", 150, 100, 250, 100, "black");
  g.appendChild(line);
  doc.register(line);

  assert.equal(
    SvgWriter.serialize(doc),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">\n' +
      '  <g id="flow">\n' +
      '    <rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>\n' +
      '    <line id="edge" x1="150" y1="100" x2="250" y2="100" stroke="black"/>\n' +
      "  </g>\n" +
      "</svg>\n"
  );
});

test("6.1 流程图会话：save → read 回放，树结构无损往返", () => {
  const { out } = repl();
  const tmp = mkdtempSync(join(tmpdir(), "svg-editor-"));
  const path = join(tmp, "flowchart.svg").replace(/\\/g, "/");

  out("init 800 600");
  out("create g flowchart");
  out("create g node1 in flowchart");
  out("create rect start 120 100 160 60 #4a90d9 in node1");
  out('create text start-label 155 135 "开始" in node1');
  out("create g node2 in flowchart");
  out("create rect process 520 100 160 60 #f5a623 in node2");
  out('create text process-label 545 135 "处理数据" in node2');
  out("create line arrow1 280 130 520 130 black in flowchart");

  assert.deepEqual(out(`save ${path}`), [`saved to ${path} (8 elements)`]);
  assert.deepEqual(out("undo"), ["error: undo not allowed after io command"]);

  assert.deepEqual(out(`read ${path}`), [`read ${path} (8 elements)`]);
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
});

test("解析器宽容规则（裁定 D17）：未支持元素、重复 id、实体、自闭合 g", () => {
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">',
    '  <defs><linearGradient id="grad"/></defs>',
    '  <rect id="a" x="1" y="2" width="3" height="4"/>',
    '  <rect id="a" x="5" y="6" width="7" height="8"/>',
    '  <g id="wrap"/>',
    '  <text id="t" x="1" y="2">a &amp; b &lt;tag&gt;</text>',
    "</svg>",
    "",
  ].join("\n");

  const result = SvgParser.parseText(svg);
  assert.deepEqual(result.warnings, [
    "warning: skipped unsupported element <defs>",
    "warning: assigned id rect1 to <rect> (duplicate id: a)",
  ]);
  assert.equal(result.doc.countElements(), 4); // a、a1、wrap（自闭合空容器）、t
  const text = result.doc.require("t");
  assert.equal(text.getAttributeText("text"), "a & b <tag>");
});
