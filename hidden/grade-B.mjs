// Hidden grader for package B (entangled steps). Usage: node grade-B.mjs <sandboxDir>
import { makeGrader, eq } from "./grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("B1 priority on addTask", 4, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  check("default → med", () => store.addTask("x").priority === "med");
  check("high accepted", () => store.addTask("y", "high").priority === "high");
  check("low accepted", () => store.addTask("z", "low").priority === "low");
  check("invalid → med", () => store.addTask("w", "URGENT").priority === "med");
});

await g.step("B2 listByPriority", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  store.addTask("a", "high");
  store.addTask("b", "low");
  store.addTask("c", "high");
  check("filters correctly", () => eq(store.listByPriority("high").map((t) => t.title), ["a", "c"]));
  check("other priority", () => eq(store.listByPriority("low").map((t) => t.title), ["b"]));
  check("none → empty array", () => eq(store.listByPriority("med"), []));
});

await g.step("B3 formatTask priority tag", 4, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("high tag", () => formatTask({ id: 1, title: "t", done: false, priority: "high" }) === "[HIGH] #1 t");
  check("med tag", () => formatTask({ id: 2, title: "u", done: false, priority: "med" }) === "[MED] #2 u");
  check("done + tag", () => formatTask({ id: 3, title: "v", done: true, priority: "low" }) === "[LOW] #3 v ✓");
  check("no priority → unchanged", () => formatTask({ id: 4, title: "w", done: false }) === "#4 w");
});

await g.step("B4 countByPriority", 2, async (check, mod) => {
  const { countByPriority } = await mod("src/stats.js");
  const ts = [{ priority: "high" }, { priority: "low" }, { priority: "med" }, {}];
  check("counts with missing→med", () => eq(countByPriority(ts), { low: 1, med: 2, high: 1 }));
  check("empty → zeros", () => eq(countByPriority([]), { low: 0, med: 0, high: 0 }));
});

await g.step("B5 parse --priority flag", 3, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("flag parsed", () => eq(parseAddCommand("add fix bug --priority high"), { title: "fix bug", priority: "high" }));
  check("default med", () => eq(parseAddCommand("add hi"), { title: "hi", priority: "med" }));
  check("invalid → med", () => eq(parseAddCommand("add x --priority urgent"), { title: "x", priority: "med" }));
});

g.baselineStep();
g.report();
