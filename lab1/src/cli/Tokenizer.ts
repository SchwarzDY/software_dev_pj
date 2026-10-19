import { EditorError } from "../domain/EditorError";

/** 命令行分词：空白分隔；双引号包裹的片段作为一个 token（引号剥除）。 */
export class Tokenizer {
  static tokenize(line: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === " " || ch === "\t") {
        i += 1;
        continue;
      }
      if (ch === '"') {
        const end = line.indexOf('"', i + 1);
        if (end === -1) throw new EditorError("unterminated quote");
        tokens.push(line.slice(i + 1, end));
        i = end + 1;
      } else {
        let j = i;
        while (j < line.length && line[j] !== " " && line[j] !== "\t") j += 1;
        tokens.push(line.slice(i, j));
        i = j;
      }
    }
    return tokens;
  }
}
