// REPL 入口：读行 → Dispatcher 执行 → 打印输出。终端交互只出现在本模块。
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import { Dispatcher } from "./Dispatcher";

const BANNER = "svg-editor 0.1 — type 'help' for commands";
const PROMPT = "svg> ";

const dispatcher = new Dispatcher();

stdout.write(BANNER + "\n");
const rl = readline.createInterface({ input: stdin, output: stdout, prompt: PROMPT });
rl.prompt();

rl.on("line", (line: string) => {
  const trimmed = line.trim();
  if (trimmed === "quit" || trimmed === "exit") {
    rl.close();
    return;
  }
  for (const out of dispatcher.execute(trimmed)) console.log(out);
  rl.prompt();
});

rl.on("close", () => {
  stdout.write("bye\n");
  process.exit(0);
});
