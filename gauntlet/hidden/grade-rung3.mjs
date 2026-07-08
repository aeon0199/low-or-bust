// Hidden grader, rung 3 (12-step tag chain on taskboard). Usage: node grade-rung3.mjs <sandbox>
// Step names start with "S<number>" so the report can plot the degradation curve.
import { makeGrader, eq } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("S1 tags field", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  check("new task has tags []", () => eq(store.addTask("x").tags, []));
  check("signature unchanged", () => store.addTask("y").title === "y");
});

await g.step("S2 addTag", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  check("adds and returns task", () => eq(store.addTag(t.id, "a").tags, ["a"]));
  check("second tag appended", () => eq(store.addTag(t.id, "b").tags, ["a", "b"]));
  check("missing id → null", () => store.addTag(999, "a") === null);
});

await g.step("S3 normalization", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  check("lowercased + trimmed", () => eq(store.addTag(t.id, "  Urgent ").tags, ["urgent"]));
  check("already-clean unchanged", () => eq(store.addTag(t.id, "ui").tags, ["urgent", "ui"]));
});

await g.step("S4 no duplicates", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  store.addTag(t.id, "a");
  check("normalized duplicate is a no-op", () => eq(store.addTag(t.id, " A ").tags, ["a"]));
  check("no error thrown, task returned", () => store.addTag(t.id, "a").id === t.id);
});

await g.step("S5 max 5 tags", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  for (const tag of ["a", "b", "c", "d", "e"]) store.addTag(t.id, tag);
  check("6th tag refused quietly", () => store.addTag(t.id, "f").tags.length === 5);
  check("original five intact", () => eq(store.addTag(t.id, "g").tags, ["a", "b", "c", "d", "e"]));
});

await g.step("S6 removeTag", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  store.addTag(t.id, "a");
  store.addTag(t.id, "b");
  check("removes with normalization", () => eq(store.removeTag(t.id, " A ").tags, ["b"]));
  check("absent tag is a no-op", () => eq(store.removeTag(t.id, "zzz").tags, ["b"]));
  check("missing id → null", () => store.removeTag(999, "a") === null);
});

await g.step("S7 listByTag", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const a = store.addTask("a"), b = store.addTask("b"), c = store.addTask("c");
  store.addTag(a.id, "web");
  store.addTag(c.id, "Web");
  check("finds normalized matches in order", () => eq(store.listByTag("web").map((t) => t.title), ["a", "c"]));
  check("no matches → []", () => eq(store.listByTag("nope"), []));
});

await g.step("S8 renameTag", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const a = store.addTask("a"), b = store.addTask("b"), c = store.addTask("c");
  store.addTag(a.id, "old");
  store.addTag(b.id, "old");
  store.addTag(b.id, "new");
  store.addTag(c.id, "other");
  const changed = store.renameTag("Old", "NEW");
  check("returns count of changed tasks", () => changed === 2);
  check("plain rename", () => eq(store.getTask(a.id).tags, ["new"]));
  check("merge leaves no duplicate", () => eq(store.getTask(b.id).tags, ["new"]));
});

await g.step("S9 tagStats", 2, async (check, mod) => {
  const { tagStats } = await mod("src/stats.js");
  const ts = [{ tags: ["a", "b"] }, { tags: ["b"] }, { tags: ["c", "b"] }, { tags: ["a"] }];
  check("count desc, alpha ties", () => eq(tagStats(ts), [["b", 3], ["a", 2], ["c", 1]]));
  check("empty → []", () => eq(tagStats([]), []));
});

await g.step("S10 formatTask tags", 3, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("tags appended", () => formatTask({ id: 1, title: "t", done: false, tags: ["a", "b"] }) === "#1 t [a,b]");
  check("done + tags", () => formatTask({ id: 2, title: "u", done: true, tags: ["x"] }) === "#2 u ✓ [x]");
  check("no tags → unchanged", () => formatTask({ id: 3, title: "v", done: false, tags: [] }) === "#3 v" && formatTask({ id: 4, title: "w", done: false }) === "#4 w");
});

await g.step("S11 parse #tags", 3, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("tags stripped + lowercased", () => eq(parseAddCommand("add fix bug #Urgent #ui"), { title: "fix bug", tags: ["urgent", "ui"] }));
  check("no tags → empty array", () => eq(parseAddCommand("add hi"), { title: "hi", tags: [] }));
  check("null cases stay null", () => parseAddCommand("nonsense") === null);
});

await g.step("S12 runCommand wires tags", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  const { runCommand } = await mod("src/index.js");
  store.resetStore();
  const reply = runCommand("add fix bug #urgent #ui");
  check("reply format unchanged", () => reply === "added #1");
  check("tags stored", () => eq(store.getTask(1).tags, ["urgent", "ui"]));
  check("untagged add still works", () => runCommand("add plain") === "added #2" && eq(store.getTask(2).tags, []));
});

g.baselineStep();
g.report();
