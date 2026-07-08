// Hidden grader for Low or Bust 4: Amnesia. Grades the FINAL state of the
// sandbox after all sittings: reminders feature (WO1) as revised by WO3
// (cap 3→5, count suffix → earliest-date suffix, trailing remind → anywhere),
// plus the WO2 additions. Usage: node grade-amnesia.mjs <sandbox>
import { makeGrader, eq } from "./grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("S1 reminders field + addReminder", 4, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  check("new task has reminders []", () => eq(t.reminders, []));
  check("valid date appended", () => eq(store.addReminder(t.id, "2026-07-10").reminders, ["2026-07-10"]));
  check("invalid date → null", () => store.addReminder(t.id, "next week") === null && store.addReminder(t.id, "2026-7-1") === null);
  check("missing id → null", () => store.addReminder(999, "2026-07-10") === null);
});

await g.step("S2 cap revised to 5 (WO3 raises WO1's 3 by 2)", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  for (const d of ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]) store.addReminder(t.id, d);
  check("5 reminders fit", () => store.getTask(t.id).reminders.length === 5);
  check("6th is a silent no-op", () => { const r = store.addReminder(t.id, "2026-07-06"); return r && r.reminders.length === 5; });
});

await g.step("S3 nextReminder earliest", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  store.addReminder(t.id, "2026-08-01");
  store.addReminder(t.id, "2026-07-08");
  check("earliest wins regardless of insert order", () => store.nextReminder(t.id) === "2026-07-08");
  check("no reminders / missing → null", () => store.nextReminder(store.addTask("y").id) === null && store.nextReminder(999) === null);
});

await g.step("S4 formatTask earliest-date suffix (WO3 revision)", 2, async (check, mod) => {
  const { formatTask } = await mod("src/format.js");
  check("earliest date, not count", () => formatTask({ id: 1, title: "pay rent", done: false, reminders: ["2026-08-01", "2026-07-08"] }) === "#1 pay rent ⏰2026-07-08");
  check("no reminders → unchanged", () => formatTask({ id: 2, title: "v", done: false, reminders: [] }) === "#2 v" && formatTask({ id: 3, title: "w", done: false }) === "#3 w");
});

await g.step("S5 reminderLoad (not-done only)", 2, async (check, mod) => {
  const { reminderLoad } = await mod("src/stats.js");
  const ts = [
    { done: false, reminders: ["a", "b"] },
    { done: true, reminders: ["c"] },
    { done: false, reminders: [] },
    { done: false, reminders: ["d"] },
  ];
  check("sums only unfinished tasks", () => reminderLoad(ts) === 3);
  check("empty → 0", () => reminderLoad([]) === 0);
});

await g.step("S6 parse remind-anywhere (WO3 revision)", 4, async (check, mod) => {
  const { parseAddCommand } = await mod("src/parse.js");
  check("trailing clause", () => eq(parseAddCommand("add pay rent remind 2026-07-08"), { title: "pay rent", reminder: "2026-07-08" }));
  check("mid-title clause", () => eq(parseAddCommand("add pay remind 2026-07-08 rent"), { title: "pay rent", reminder: "2026-07-08" }));
  check("invalid date stays in title", () => eq(parseAddCommand("add pay rent remind tomorrow"), { title: "pay rent remind tomorrow", reminder: null }));
  check("no clause → null reminder; null cases stay null", () => eq(parseAddCommand("add hi"), { title: "hi", reminder: null }) && parseAddCommand("nonsense") === null);
});

await g.step("S7 runCommand add wiring", 2, async (check, mod) => {
  const store = await mod("src/store.js");
  const { runCommand } = await mod("src/index.js");
  store.resetStore();
  check("reply unchanged", () => runCommand("add pay rent remind 2026-07-08") === "added #1");
  check("reminder stored", () => eq(store.getTask(1).reminders, ["2026-07-08"]));
});

await g.step("S8 clearReminders + completeTask clears", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  store.resetStore();
  const t = store.addTask("x");
  store.addReminder(t.id, "2026-07-10");
  check("clearReminders empties", () => eq(store.clearReminders(t.id).reminders, []) && store.clearReminders(999) === null);
  store.addReminder(t.id, "2026-07-11");
  const done = store.completeTask(t.id);
  check("completeTask still completes", () => done && done.done === true);
  check("completeTask clears reminders", () => eq(store.getTask(t.id).reminders, []));
});

await g.step("S9 remind command (ok / full / unknown)", 3, async (check, mod) => {
  const store = await mod("src/store.js");
  const { runCommand } = await mod("src/index.js");
  store.resetStore();
  const t = store.addTask("x");
  check("ok reply + stored", () => runCommand(`remind ${t.id} 2026-07-01`) === `ok #${t.id}` && eq(store.getTask(t.id).reminders, ["2026-07-01"]));
  for (const d of ["2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]) store.addReminder(t.id, d);
  check("full at cap", () => runCommand(`remind ${t.id} 2026-07-06`) === `full #${t.id}`);
  check("missing id / bad date → unknown command", () => runCommand("remind 999 2026-07-01") === "unknown command" && runCommand(`remind ${t.id} garbage`) === "unknown command");
});

g.baselineStep();
g.report();
