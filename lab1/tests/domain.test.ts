import test from "node:test";
import assert from "node:assert/strict";

import { Rect } from "../src/domain/Rect";
import { Circle } from "../src/domain/Circle";
import { Text } from "../src/domain/Text";
import { Line } from "../src/domain/Line";
import { Group } from "../src/domain/Group";
import { Document } from "../src/domain/Document";
import { ShapeFactory } from "../src/domain/ShapeFactory";
import { fmtNum } from "../src/domain/num";

test("rect 的 move / scale 作用于位置与尺寸", () => {
  const r = new Rect("r1", 10, 20, 100, 50, "#eee");
  r.move(5, -5);
  assert.equal(r.x, 15);
  assert.equal(r.y, 15);
  r.scale(2);
  assert.equal(r.x, 30);
  assert.equal(r.y, 30);
  assert.equal(r.width, 200);
  assert.equal(r.height, 100);
});

test("text 的 scale 只作用于 x / y（font-size 不参与）", () => {
  const t = new Text("t1", 20, 40, "hello");
  t.scale(2);
  assert.equal(t.x, 40);
  assert.equal(t.y, 80);
});

test("容器的 move / scale 递归到子孙", () => {
  const g = new Group("g1");
  const r = new Rect("r", 10, 10, 100, 50);
  const t = new Text("t", 15, 35, "label");
  g.appendChild(r);
  g.appendChild(t);

  g.move(0, 100);
  assert.equal(r.y, 110);
  assert.equal(t.y, 135);

  g.scale(0.5);
  assert.equal(r.x, 5);
  assert.equal(r.width, 50);
  assert.equal(t.x, 7.5);
});

test("setAttribute 白名单：公共属性与各类型几何属性", () => {
  const c = new Circle("c1", 100, 100, 20, "red");
  c.setAttribute("fill", "blue");
  assert.equal(c.fill, "blue");
  c.setAttribute("r", "30");
  assert.equal(c.r, 30);
  assert.throws(() => c.setAttribute("x", "1"), /unknown attribute: x/);

  const t = new Text("t", 1, 2, "a");
  t.setAttribute("text", "b");
  assert.equal(t.content, "b");

  const g = new Group("g1");
  g.setAttribute("fill", "red"); // 容器仅公共三项
  assert.throws(() => g.setAttribute("x", "1"), /unknown attribute: x/);
});

test("tree 摘要格式与规范示例一致", () => {
  const bg = new Rect("bg", 0, 0, 800, 600, "#ffffff");
  assert.equal(bg.summary(), "x=0 y=0 w=800 h=600 fill=#ffffff");
  const title = new Text("title", 20, 40, "My Diagram");
  assert.equal(title.summary(), '(20,40) "My Diagram"');
  const arrow = new Line("a1", 280, 130, 520, 130, "black");
  assert.equal(arrow.summary(), "(280,130) -> (520,130) stroke=black");
  const c = new Circle("c1", 100, 100, 20);
  assert.equal(c.summary(), "cx=100 cy=100 r=20");
});

test("工厂：未知类型（含本阶段不实现的 box）", () => {
  assert.throws(
    () => ShapeFactory.create("box", "n1", ["1", "2", "3", "4", "x"]),
    /unknown shape type: box \(is the plugin loaded\?\)/
  );
});

test("工厂：参数个数与数字合法性", () => {
  assert.throws(() => ShapeFactory.create("rect", "r", ["1", "2"]), /wrong number of arguments/);
  assert.throws(() => ShapeFactory.create("rect", "r", ["a", "2", "3", "4"]), /invalid number: a/);
  const r = ShapeFactory.create("rect", "r", ["10", "20", "100", "50", "#eee"]);
  assert.equal(r.typeName, "rect");
  assert.ok(r instanceof Rect);
});

test("Document 的 id 索引：查、重、容器连带摘除", () => {
  const doc = new Document(800, 600);
  const g = new Group("g1");
  doc.register(g);
  const r = new Rect("r", 0, 0, 10, 10);
  doc.register(r);
  g.appendChild(r);

  assert.equal(doc.countElements(), 2);
  assert.throws(() => doc.register(new Circle("r", 1, 1, 1)), /id already exists: r/);

  doc.unregister(g);
  assert.equal(doc.countElements(), 0);
  assert.throws(() => doc.require("r"), /no such shape: r/);
});

test("isDescendantOf 沿父链判断", () => {
  const doc = new Document(800, 600);
  const outer = new Group("outer");
  const inner = new Group("inner");
  const leaf = new Rect("leaf", 0, 0, 1, 1);
  doc.root.appendChild(outer);
  outer.appendChild(inner);
  inner.appendChild(leaf);

  assert.ok(leaf.isDescendantOf(inner));
  assert.ok(leaf.isDescendantOf(outer));
  const other = new Group("other");
  assert.ok(!leaf.isDescendantOf(other));
  assert.ok(!outer.isDescendantOf(inner)); // 兄弟/祖先方向不成立
});

test("fmtNum 消除浮点噪声", () => {
  assert.equal(fmtNum(0.1 + 0.2), "0.3");
  assert.equal(fmtNum(5), "5");
});

test("toSvg 与规范第 0.1 节示例一致", () => {
  const g = new Group("flow");
  g.appendChild(new Rect("start", 30, 70, 120, 60, "#4a90d9"));
  g.appendChild(new Line("edge", 150, 100, 250, 100, "black"));
  const svg = g.toSvg("");
  assert.ok(svg.includes('<g id="flow">'));
  assert.ok(svg.includes('<rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>'));
  assert.ok(svg.includes('<line id="edge" x1="150" y1="100" x2="250" y2="100" stroke="black"/>'));
});
