// M0 骨架：仅保证 REPL 可启动（banner / 提示符 / 注释 / 退出）。
// 命令分词与分发将在 M4 重构为 Repl / Dispatcher 等类。
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

const BANNER = "svg-editor 0.1 — type 'help' for commands";
const PROMPT = "svg> ";

const rl = readline.createInterface({ input: stdin, output: stdout, prompt: PROMPT });

stdout.write(BANNER + "\n");
rl.prompt();

rl.on("line", (line: string) => {
  const text = line.trim();
  if (text === "" || text.startsWith("#")) {
    // 空行与 # 注释：不响应
  } else if (text === "quit" || text === "exit") {
    rl.close();
    return;
  } else {
    const first = text.split(/\s+/)[0] ?? "";
    console.log(`error: unknown command: ${first} (type 'help')`);
  }
  rl.prompt();
});

rl.on("close", () => {
  stdout.write("bye\n");
  process.exit(0);
});
