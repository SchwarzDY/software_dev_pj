import { EditorError } from "./EditorError";

/** 解析命令行里的数字参数；非法时抛出规格式错误。 */
export function parseNum(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new EditorError(`invalid number: ${raw}`);
  return n;
}

/** 数字的最短合理表示：整数无小数点，浮点截断到 4 位，避免 0.30000000000000004 之类的浮点噪声。 */
export function fmtNum(n: number): string {
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}
