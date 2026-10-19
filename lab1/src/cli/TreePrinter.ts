import { Document } from "../domain/Document";
import { Group } from "../domain/Group";
import type { Shape } from "../domain/Shape";
import { fmtNum } from "../domain/num";

interface Row {
  prefix: string;
  shape: Shape;
}

/**
 * tree 命令的树形渲染。
 * 对齐规则（裁定 D16）：属性列 = 全树最长的「前缀 + 名字」末列 + 2；
 * 容器行无属性摘要则不加填充。
 */
export class TreePrinter {
  static printDocument(doc: Document): string[] {
    const rows: Row[] = [];
    TreePrinter.collectChildren(doc.root, "", rows);
    return [`svg (${fmtNum(doc.width)}x${fmtNum(doc.height)})`, ...TreePrinter.render(rows)];
  }

  static printSubtree(shape: Shape): string[] {
    const rows: Row[] = [{ prefix: "", shape }];
    if (shape instanceof Group) {
      TreePrinter.collectChildren(shape, "", rows);
    }
    return TreePrinter.render(rows);
  }

  private static collectChildren(group: Group, prefix: string, rows: Row[]): void {
    const children = group.children;
    children.forEach((child, i) => {
      const last = i === children.length - 1;
      rows.push({ prefix: prefix + (last ? "└── " : "├── "), shape: child });
      if (child instanceof Group) {
        TreePrinter.collectChildren(child, prefix + (last ? "    " : "│   "), rows);
      }
    });
  }

  private static render(rows: Row[]): string[] {
    let maxEnd = 0;
    for (const r of rows) {
      maxEnd = Math.max(maxEnd, r.prefix.length + r.shape.ref().length);
    }
    const col = maxEnd + 2;
    return rows.map((r) => {
      const name = r.shape.ref();
      const summary = r.shape.summary();
      if (summary === "") return r.prefix + name;
      const pad = " ".repeat(Math.max(1, col - r.prefix.length - name.length));
      return r.prefix + name + pad + summary;
    });
  }
}
