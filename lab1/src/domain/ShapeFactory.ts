import { EditorError } from "./EditorError";
import { Rect } from "./Rect";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Line } from "./Line";
import { Text } from "./Text";
import { Group } from "./Group";
import { parseNum } from "./num";
import type { Shape } from "./Shape";

type Creator = (id: string, args: string[]) => Shape;

function requireArgs(type: string, args: string[], min: number, max: number): void {
  if (args.length < min || args.length > max) {
    const expected = min === max ? String(min) : `${min}-${max}`;
    throw new EditorError(`wrong number of arguments for ${type}: expected ${expected}, got ${args.length}`);
  }
}

function optionalAt(args: string[], index: number): string | undefined {
  return args.length > index ? args[index] : undefined;
}

/**
 * 名字分派点①（规范允许且须标注待重构的两处之一）：create 的类型名 → 构造规则。
 * 待重构：插件化阶段改为 ShapeProvider 注册表，插件（如 box）向其注册类型，内核零改动。
 */
export class ShapeFactory {
  private static readonly creators = new Map<string, Creator>();

  static {
    ShapeFactory.creators.set("rect", (id, a) => {
      requireArgs("rect", a, 4, 5);
      return new Rect(id, parseNum(a[0]), parseNum(a[1]), parseNum(a[2]), parseNum(a[3]), optionalAt(a, 4));
    });
    ShapeFactory.creators.set("circle", (id, a) => {
      requireArgs("circle", a, 3, 4);
      return new Circle(id, parseNum(a[0]), parseNum(a[1]), parseNum(a[2]), optionalAt(a, 3));
    });
    ShapeFactory.creators.set("ellipse", (id, a) => {
      requireArgs("ellipse", a, 4, 5);
      return new Ellipse(id, parseNum(a[0]), parseNum(a[1]), parseNum(a[2]), parseNum(a[3]), optionalAt(a, 4));
    });
    ShapeFactory.creators.set("line", (id, a) => {
      requireArgs("line", a, 4, 5);
      return new Line(id, parseNum(a[0]), parseNum(a[1]), parseNum(a[2]), parseNum(a[3]), optionalAt(a, 4));
    });
    ShapeFactory.creators.set("text", (id, a) => {
      requireArgs("text", a, 3, 3);
      return new Text(id, parseNum(a[0]), parseNum(a[1]), a[2]);
    });
    ShapeFactory.creators.set("g", (id, a) => {
      requireArgs("g", a, 0, 0);
      return new Group(id);
    });
  }

  static create(type: string, id: string, args: string[]): Shape {
    const creator = ShapeFactory.creators.get(type);
    if (creator === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return creator(id, args);
  }

  /** help 显示可创建的类型列表。 */
  static knownTypes(): string[] {
    return [...ShapeFactory.creators.keys()];
  }
}
