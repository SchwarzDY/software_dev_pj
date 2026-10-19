import { writeFileSync } from "node:fs";
import { Document } from "../domain/Document";
import { EditorError } from "../domain/EditorError";
import { fmtNum } from "../domain/num";

/** 文档级序列化：XML 头、<svg> 根与嵌套缩进；图形级序列化由各图形的 toSvg 提供。 */
export class SvgWriter {
  static serialize(doc: Document): string {
    const w = fmtNum(doc.width);
    const h = fmtNum(doc.height);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
      ...doc.root.children.map((c) => c.toSvg("  ")),
      "</svg>",
    ];
    return lines.join("\n") + "\n";
  }

  static write(doc: Document, path: string): void {
    try {
      writeFileSync(path, SvgWriter.serialize(doc), "utf8");
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
  }
}
