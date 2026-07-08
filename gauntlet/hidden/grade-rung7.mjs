// Hidden grader, rung 7 (revision chain). Tests FINAL contracts; each revised
// rule is attributed to the step that last touched it, so a failure at S20/S23
// etc. means the model applied a stale, superseded version of the rule.
import { makeGrader, eq } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

const fresh = async (mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  return store;
};

await g.step("S1 notes field", 1, async (check, mod) => {
  const store = await fresh(mod);
  check("new task has notes []", () => eq(store.addTask("x").notes, []));
});

await g.step("S2 note attach basics", 2, async (check, mod) => {
  const store = await fresh(mod);
  const t = store.addTask("x");
  const attach = store.attachNote ?? store.addNote;
  check("returns updated task", () => eq(attach(t.id, "n").notes, ["n"]));
  check("missing id → null", () => attach(999, "n") === null);
});

await g.step("S3 notes append in order", 1, async (check, mod) => {
  const store = await fresh(mod);
  const t = store.addTask("x");
  const attach = store.attachNote ?? store.addNote;
  attach(t.id, "a");
  attach(t.id, "b");
  check("order preserved", () => eq(store.getTask(t.id).notes, ["a", "b"]));
});

await g.step("S4 zero notes render unchanged", 1, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("no suffix without notes", () => formatTask({ id: 1, title: "t", done: false, notes: [] }) === "#1 t");
});

await g.step("S5 priority at creation", 3, async (check, mod) => {
  const store = await fresh(mod);
  check("default med", () => store.addTask("a").priority === "med");
  check("explicit high", () => store.addTask("b", "high").priority === "high");
  check("invalid → med", () => store.addTask("c", "URGENT").priority === "med");
});

await g.step("S6 listByPriority", 1, async (check, mod) => {
  const store = await fresh(mod);
  store.addTask("a", "high");
  store.addTask("b", "low");
  store.addTask("c", "high");
  check("filters in insertion order", () => eq(store.listByPriority("high").map((t) => t.title), ["a", "c"]));
});

await g.step("S7 no priority field → no prefix", 1, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("legacy task unprefixed", () => formatTask({ id: 4, title: "w", done: false }) === "#4 w");
});

await g.step("S8 notesCount sums", 1, async (check, mod) => {
  const { notesCount } = await mod("src/stats.js");
  check("plain sum", () => notesCount([{ notes: ["a"] }, { notes: ["b", "c"] }]) === 3);
});

await g.step("S9 trailing !priority token", 3, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("trailing token", () => { const r = parseAddCommand("add fix bug !high"); return r.title === "fix bug" && r.priority === "high"; });
  check("no token → med", () => { const r = parseAddCommand("add hi"); return r.title === "hi" && r.priority === "med"; });
  check("null cases stay null", () => parseAddCommand("nonsense") === null);
});

await g.step("S10 runCommand wires priority", 2, async (check, mod) => {
  const store = await fresh(mod);
  const { runCommand } = await mod("src/index.js");
  check("reply unchanged", () => runCommand("add x !low") === "added #1");
  check("priority stored", () => store.getTask(1).priority === "low");
});

await g.step("S11 full task → null (not silent)", 1, async (check, mod) => {
  const store = await fresh(mod);
  const t = store.addTask("x");
  const attach = store.attachNote ?? store.addNote;
  check("below cap returns task", () => attach(t.id, "one")?.id === t.id);
});

await g.step("S12 note suffix is [n]", 2, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("bracket count", () => formatTask({ id: 1, title: "fix bug", done: false, notes: ["a", "b"] }) === "#1 fix bug [2]");
  check("after done marker", () => formatTask({ id: 2, title: "x", done: true, notes: ["a"] }) === "#2 x ✓ [1]");
});

await g.step("S13 archive semantics", 4, async (check, mod) => {
  const store = await fresh(mod);
  const a = store.addTask("a", "high");
  store.addTask("b", "high");
  check("archive returns task", () => store.archive(a.id)?.archived === true);
  check("listTasks excludes archived", () => eq(store.listTasks().map((t) => t.title), ["b"]));
  check("listTasks(true) includes", () => store.listTasks(true).length === 2);
  check("listByPriority excludes archived", () => eq(store.listByPriority("high").map((t) => t.title), ["b"]));
});

await g.step("S14 low prefix exists", 1, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("low tagged", () => formatTask({ id: 1, title: "t", done: false, priority: "low", notes: [] }).startsWith("[LOW] "));
});

await g.step("S15 searchNotes", 2, async (check, mod) => {
  const store = await fresh(mod);
  const attach = store.attachNote ?? store.addNote;
  const a = store.addTask("a"), b = store.addTask("b"), c = store.addTask("c");
  attach(a.id, "Call the Vendor");
  attach(b.id, "unrelated");
  attach(c.id, "vendor follow-up");
  store.archive(c.id);
  check("case-insensitive match", () => eq(store.searchNotes("VENDOR").map((t) => t.title), ["a"]));
  check("no match → []", () => eq(store.searchNotes("zzz"), []));
});

await g.step("S16 attachNote + addNote alias", 2, async (check, mod) => {
  const store = await fresh(mod);
  const t = store.addTask("x");
  check("attachNote exists", () => typeof store.attachNote === "function" && eq(store.attachNote(t.id, "a").notes, ["a"]));
  check("addNote alias works", () => typeof store.addNote === "function" && eq(store.addNote(t.id, "b").notes, ["a", "b"]));
});

await g.step("S17 priorityCounts", 1, async (check, mod) => {
  const { priorityCounts } = await mod("src/stats.js");
  const ts = [{ priority: "high" }, { priority: "low" }, {}, { priority: "high", archived: true }];
  check("counts unarchived, missing→med", () => eq(priorityCounts(ts), { low: 1, med: 1, high: 1 }));
});

await g.step("S18 !token anywhere in title", 2, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("mid-title token extracted", () => { const r = parseAddCommand("add fix !low the bug"); return r.title === "fix the bug" && r.priority === "low"; });
  check("trailing still works", () => { const r = parseAddCommand("add hi !high"); return r.title === "hi" && r.priority === "high"; });
});

await g.step("S19 completeTask on archived → null", 2, async (check, mod) => {
  const store = await fresh(mod);
  const a = store.addTask("a");
  const b = store.addTask("b");
  store.archive(a.id);
  check("archived not completable", () => store.completeTask(a.id) === null);
  check("unarchived still completes", () => store.completeTask(b.id)?.done === true);
});

await g.step("S20 cap is 7, overflow → null", 2, async (check, mod) => {
  const store = await fresh(mod);
  const t = store.addTask("x");
  const attach = store.attachNote ?? store.addNote;
  let last;
  for (let i = 1; i <= 7; i++) last = attach(t.id, `n${i}`);
  check("7th note accepted", () => last !== null && store.getTask(t.id).notes.length === 7);
  check("8th → null", () => attach(t.id, "n8") === null && store.getTask(t.id).notes.length === 7);
});

await g.step("S21 list rendering respects archive", 2, async (check, mod) => {
  const store = await fresh(mod);
  const { formatList } = await mod("src/format.js");
  const { runCommand } = await mod("src/index.js");
  check("empty → (no tasks)", () => formatList([]) === "(no tasks)");
  const a = store.addTask("visible");
  const b = store.addTask("hidden");
  store.archive(b.id);
  check("runCommand list excludes archived", () => { const out = runCommand("list"); return out.includes("visible") && !out.includes("hidden"); });
});

await g.step("S22 notesCount skips archived", 1, async (check, mod) => {
  const { notesCount } = await mod("src/stats.js");
  check("archived notes ignored", () => notesCount([{ notes: ["a"] }, { notes: ["b", "c"], archived: true }]) === 1);
});

await g.step("S23 every priority prefixed", 3, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("med tagged", () => formatTask({ id: 1, title: "t", done: false, priority: "med", notes: [] }) === "[MED] #1 t");
  check("high tagged", () => formatTask({ id: 2, title: "u", done: false, priority: "high", notes: [] }) === "[HIGH] #2 u");
  check("full combo", () => formatTask({ id: 3, title: "v", done: true, priority: "low", notes: ["a", "b"] }) === "[LOW] #3 v ✓ [2]");
});

await g.step("S24 runCommand archive", 3, async (check, mod) => {
  const store = await fresh(mod);
  const { runCommand } = await mod("src/index.js");
  runCommand("add target");
  check("archives and replies", () => runCommand("archive 1") === "archived #1");
  check("store agrees", () => store.getTask(1).archived === true);
  check("bad id → unknown command", () => runCommand("archive 999") === "unknown command");
});

g.baselineStep();
g.report();
