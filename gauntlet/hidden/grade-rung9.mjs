// Hidden grader, rung 9 "The Telephone Game" (taskboard + messy transcript spec).
// Grades the FINAL untangled requirements: due dates on tasks, listOverdue,
// bracketed format suffix (the parens version was revised away), "by <date>"
// parsing, runCommand wiring, and the "overdue <date>" command. Lenient where
// the transcript was silent (done-marker vs due-suffix ordering), strict where
// it was explicit. Usage: node grade-rung9.mjs <sandbox>
import { makeGrader, eq } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("S1 addTask due field", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  check("valid due stored", () => store.addTask("x", "2026-07-08").due === "2026-07-08");
  check("no due → null", () => store.addTask("y").due === null);
  check("old shape intact", () => { const t = store.addTask("z"); return t.title === "z" && t.done === false; });
});

await g.step("S2 invalid dates become null", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  check("prose date → null", () => store.addTask("x", "next tuesday").due === null);
  check("wrong shape → null", () => store.addTask("y", "2026-7-8").due === null);
});

await g.step("S3 listOverdue", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const a = store.addTask("early", "2026-07-01");
  const b = store.addTask("today", "2026-07-08");
  store.addTask("none");
  const d = store.addTask("done-early", "2026-07-01");
  store.completeTask(d.id);
  check("strictly before, in order", () => eq(store.listOverdue("2026-07-08").map((t) => t.title), ["early"]));
  check("due today is not overdue", () => !store.listOverdue("2026-07-08").some((t) => t.id === b.id));
  check("wider window picks up more", () => eq(store.listOverdue("2026-07-09").map((t) => t.title), ["early", "today"]));
});

await g.step("S4 formatTask due suffix (bracket revision)", 3, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("bracketed, not parens", () => formatTask({ id: 1, title: "pay rent", done: false, due: "2026-07-08" }) === "#1 pay rent [due 2026-07-08]");
  check("no due → exactly as before", () => formatTask({ id: 2, title: "v", done: false, due: null }) === "#2 v" && formatTask({ id: 3, title: "w", done: false }) === "#3 w");
  check("done + due (either order)", () => {
    const s = formatTask({ id: 4, title: "u", done: true, due: "2026-07-08" });
    return s === "#4 u ✓ [due 2026-07-08]" || s === "#4 u [due 2026-07-08] ✓";
  });
});

await g.step("S5 parse 'by <date>'", 4, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("trailing by-date extracted", () => eq(parseAddCommand("add pay rent by 2026-07-08"), { title: "pay rent", due: "2026-07-08" }));
  check("no by-date → due null", () => eq(parseAddCommand("add buy milk"), { title: "buy milk", due: null }));
  check("invalid date stays in title", () => eq(parseAddCommand("add buy milk by tomorrow"), { title: "buy milk by tomorrow", due: null }));
  check("null cases stay null", () => parseAddCommand("nonsense") === null);
});

await g.step("S6 runCommand wires due through", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  const { runCommand } = await mod("src/index.js");
  store.resetStore();
  check("reply unchanged", () => runCommand("add pay rent by 2026-07-08") === "added #1");
  check("due saved", () => store.getTask(1).due === "2026-07-08");
});

await g.step("S7 overdue command", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  const { runCommand } = await mod("src/index.js");
  const { formatTask } = await mod("src/format.js");
  store.resetStore();
  const a = store.addTask("early", "2026-07-01");
  const b = store.addTask("late", "2026-07-05");
  store.addTask("future", "2026-08-01");
  check("one per line, normal format", () => runCommand("overdue 2026-07-10") === `${formatTask(a)}\n${formatTask(b)}`);
  check("(none) when empty", () => runCommand("overdue 2026-01-01") === "(none)");
  check("list untouched", () => runCommand("list").split("\n").length === 3);
});

g.baselineStep();
g.report();
