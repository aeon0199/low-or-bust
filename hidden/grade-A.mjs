// Hidden grader for package A (independent steps). Usage: node grade-A.mjs <sandboxDir>
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { makeGrader, eq } from "./grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("A1 formatDuration", 6, async (check, mod) => {
  const { formatDuration } = await mod("src/format.js");
  for (const [inp, exp] of [[45, "45s"], [125, "2m 5s"], [3600, "1h"], [3780, "1h 3m"], [3665, "1h 1m 5s"], [0, "0s"]]) {
    check(`formatDuration(${inp})`, () => formatDuration(inp) === exp);
  }
});

await g.step("A2 completionRate empty fix", 2, async (check, mod) => {
  const { completionRate } = await mod("src/stats.js");
  check("empty list → 0", () => completionRate([]) === 0);
  check("half done → 0.5", () => completionRate([{ done: true }, { done: false }]) === 0.5);
});

await g.step("A3 removeTask", 4, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("target");
  store.addTask("keeper");
  check("remove existing → true", () => store.removeTask(t.id) === true);
  check("list shrinks", () => store.listTasks().length === 1);
  check("remove again → false", () => store.removeTask(t.id) === false);
  check("keeper survives", () => store.listTasks()[0].title === "keeper");
});

await g.step("A4 parse validation", 3, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("whitespace title → null", () => parseAddCommand("add   ") === null);
  check("normal add works", () => parseAddCommand("add hi").title === "hi");
  check("non-add still null", () => parseAddCommand("nonsense") === null);
});

await g.step("A5 format tests written", 3, async (check) => {
  const file = join(sandbox, "test/format.test.mjs");
  check("file exists", () => existsSync(file));
  check("covers both functions", () => {
    const src = readFileSync(file, "utf8");
    return src.includes("formatTask") && src.includes("formatList");
  });
  check("test file passes", () => {
    execFileSync("node", ["--test", "test/format.test.mjs"], { cwd: sandbox, timeout: 30_000, stdio: "pipe" });
    return true;
  });
});

g.baselineStep();
g.report();
