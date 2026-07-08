// The Gauntlet — five rungs designed to push LOW effort until it cracks.
// Protocol (see gauntlet.mjs): one low run per rung; only a failure triggers
// extra spending (2 more low trials + 1 high trial) to classify the crack.

export const rungs = [
  {
    id: "rung1-discovery",
    kind: "agentic",
    fixture: "gauntlet/rung1-ledgerlite",
    grader: "gauntlet/hidden/grade-rung1.mjs",
    title: "Discovery debugging (~450 lines)",
    axis: "find the bug from a symptom, no file hints",
    brief: `You are working on "ledgerlite", a small personal-finance ledger library in the current directory.

Bug report from users: "I'm in New Zealand. Transactions I make in the evening show up under the WRONG DAY in the daily summary — they appear under the next day. My colleague in London sees them under the correct day. The CSV export timestamps are fine."

Find the root cause and fix it. Do not change any public API signatures, and do not change intentional user-facing display behavior. Fix the actual cause, not the symptom.`,
  },
  {
    id: "rung2-crossfile",
    kind: "agentic",
    fixture: "gauntlet/rung2-hubapi",
    grader: "gauntlet/hidden/grade-rung2.mjs",
    title: "Needle in 25 files (~1,100 lines)",
    axis: "convention violation hidden among 20 near-identical modules",
    brief: `You are working on "hubapi", an in-memory resource API in the current directory (a common router, validator, and store in src/core/, and 20 resource modules in src/resources/).

Bug report: "Creating a payment ALWAYS fails with validation_failed, even with a perfectly valid payload. Every other resource creates fine. Weirdly, the error detail is an empty list."

Find the root cause and fix it. The shared core contract must not change, and the other 19 resources must keep working exactly as they do.`,
  },
  {
    id: "rung3-longchain",
    kind: "agentic",
    fixture: "fixture",
    grader: "gauntlet/hidden/grade-rung3.mjs",
    title: "12-step dependent chain, one session",
    axis: "context bloat: does quality degrade by step 12?",
    brief: `You are working on "taskboard", a small ES-module JavaScript library in the current directory (src/store.js, src/format.js, src/stats.js, src/parse.js, src/index.js, with tests in test/). Keep the existing tests in test/baseline.test.mjs passing throughout. Do not add dependencies.

Implement ALL 12 of the following changes, in order — later steps build on earlier ones:

1. In src/store.js, every task object gains a tags field: a (possibly empty) array of strings. addTask keeps its signature.

2. In src/store.js, add an exported function addTag(id, tag). It adds the tag to that task's tags and returns the updated task, or returns null if no task with that id exists.

3. Tags are normalized when added: lowercased and trimmed. addTag(1, "  Urgent ") stores "urgent".

4. A task never holds duplicate tags (after normalization). Adding a duplicate is not an error: addTag returns the task unchanged.

5. A task holds at most 5 tags. Adding a 6th is not an error: addTag returns the task unchanged.

6. In src/store.js, add an exported function removeTag(id, tag) using the same normalization to match. It returns the updated task, or null if the task doesn't exist. Removing a tag the task doesn't have just returns the task.

7. In src/store.js, add an exported function listByTag(tag): all tasks carrying the (normalized) tag, in insertion order.

8. In src/store.js, add an exported function renameTag(oldTag, newTag): across ALL tasks, replaces oldTag with newTag (both normalized). If a task already has newTag, the old one is simply removed (no duplicates). Returns the number of tasks that changed.

9. In src/stats.js, add an exported function tagStats(tasks): returns an array of [tag, count] pairs, sorted by count descending, ties broken alphabetically by tag.

10. In src/format.js, update formatTask: a task with at least one tag gets " [tag1,tag2]" appended (tags in stored order, comma-separated, no spaces inside the brackets). Tasks with no tags (or no tags field) render exactly as before.

11. In src/parse.js, update parseAddCommand: trailing "#tag" tokens are stripped from the title and returned lowercased in a tags array. "add fix bug #Urgent #ui" → { title: "fix bug", tags: ["urgent", "ui"] }. With no tags: { title, tags: [] }. The existing null cases stay null.

12. In src/index.js, update runCommand so an add command with tags stores them: runCommand("add fix bug #urgent") creates the task AND applies the tags via the store, then returns the same "added #<id>" string as before.`,
  },
  {
    id: "rung4-underspec",
    kind: "agentic",
    fixture: "gauntlet/rung4-hubapi",
    grader: "gauntlet/hidden/grade-rung4.mjs",
    title: "Underspecified feature (rate limiting)",
    axis: "design decisions left open, graded on behavior",
    brief: `You are working on "hubapi", an in-memory resource API in the current directory (common router/validator/store in src/core/, 20 resource modules in src/resources/).

Add per-user rate limiting to the API. Requirements:
- A user may make at most 60 requests per rolling 60-second window. The 61st request within the window is rejected.
- A rejected request returns the standard failure shape with error "rate_limited" (use the existing failure() helper).
- Different users never affect each other's limits.
- Rate limiting applies to every routed action, in one place — do not edit 20 resource modules.
- Read time via the existing injectable clock (src/core/clock.js) so tests can control it.
- Export a resetRateLimiter() function from a new file src/core/ratelimit.js so tests can reset state.

Everything else about how you design it is up to you.`,
  },
  {
    id: "rung5-adversarial",
    kind: "oneshot",
    grader: null, // graded inline from `answers`
    title: "Adversarial code reading",
    axis: "predict-the-output traps, instinct is wrong",
    brief: `Predict the EXACT output of each JavaScript snippet below (Node, module scope, no tricks with the environment). Think carefully — several of these are designed to punish first instincts.

Snippet 1: console.log([1, 2, 3].map(parseInt))          — give the three array elements
Snippet 2: console.log([10, 1, 2].sort())                — give the three array elements
Snippet 3: console.log(typeof null, typeof NaN)          — give both words
Snippet 4: console.log(0.1 + 0.2 === 0.3, 0.1 + 0.2 > 0.3) — give both booleans
Snippet 5:
console.log("a");
setTimeout(() => console.log("b"), 0);
Promise.resolve().then(() => console.log("c"));
console.log("d");
— give the four letters in print order

Snippet 6:
const arr = [1, 2, 3, 4];
for (const x of arr) { if (x === 2) arr.splice(arr.indexOf(x), 1); }
console.log(arr.join(","));
— give the printed string

Snippet 7:
let count = 0;
function make() { let n = 0; return () => { n++; count++; return n; }; }
const f = make(), g = make();
f(); f(); g();
console.log(f(), g(), count);
— give the three printed numbers

End your reply with exactly 7 lines in this format (comma-separate multiple values, no spaces):
ANSWER1: <...>
ANSWER2: <...>
...
ANSWER7: <...>`,
    // every answer below was established by executing the snippet, not from memory
    answers: {
      1: "1,nan,nan",
      2: "1,10,2",
      3: "object,number",
      4: "false,true",
      5: "a,d,c,b",
      6: "1,3,4",
      7: "3,2,5",
    },
  },
  {
    id: "rung6-labyrinth",
    kind: "agentic",
    fixture: "gauntlet/rung6-storefront",
    grader: "gauntlet/hidden/grade-rung6.mjs",
    title: "The Labyrinth: 3 bugs + a decoy (38 files)",
    axis: "interacting bugs, overlapping symptoms, one report is not a bug",
    brief: `You are working on "storefront", an order pricing and reporting library in the current directory (core pipeline in src/core/, 30 per-category analytics modules in src/categories/).

Four reports came in from users this week:

REPORT 1 (finance): "The weekly revenue report is always missing the last day of the range. If I run Monday-to-Sunday, Sunday's orders aren't counted."

REPORT 2 (EU team): "EUR order totals are off by one cent sometimes after conversion to USD. Small amounts, but audit flags every mismatch."

REPORT 3 (support): "Customers with a fixed-amount coupon are being charged more than they should be — the discount comes out smaller than advertised."

REPORT 4 (ops): "Order numbers are skipping values — the sequence went 1041 to 1043 with no 1042 anywhere. Are we losing orders?"

Investigate ALL FOUR reports. Important: at least one report may describe intended, documented behavior rather than a bug — verify against the code and its comments before changing anything. Fix every real bug at its root cause. Do not break any other behavior; some code in this repo looks suspicious but is deliberate and load-bearing.`,
  },
  {
    id: "rung7-revisions",
    kind: "agentic",
    fixture: "fixture",
    grader: "gauntlet/hidden/grade-rung7.mjs",
    title: "The Revision Chain: 24 steps, later ones contradict earlier",
    axis: "stale-memory pressure: the spec keeps changing mid-session",
    brief: `You are working on "taskboard", a small ES-module JavaScript library in the current directory (src/store.js, src/format.js, src/stats.js, src/parse.js, src/index.js, tests in test/). Keep test/baseline.test.mjs passing throughout. Do not add dependencies.

Implement ALL 24 of the following changes IN ORDER. Later steps sometimes REVISE earlier ones — the final code must reflect the latest revision of every rule.

1. Every task object gains a notes field: an array of strings, empty for new tasks. addTask keeps its signature.

2. Add an exported store function addNote(id, text): appends the note and returns the updated task, or null if no task with that id exists.

3. A task holds at most 10 notes; adding beyond the cap is a silent no-op returning the task.

4. Update formatTask: a task with n >= 1 notes gets " (n notes)" appended, e.g. "#1 fix bug (2 notes)".

5. Every task also gains a priority field: "low", "med", or "high", set at creation via addTask(title, priority), defaulting to "med"; invalid values become "med".

6. Add an exported store function listByPriority(priority): tasks with that priority, insertion order.

7. Update formatTask: HIGH-priority tasks (only) get the prefix "[HIGH] " before everything else. Tasks missing a priority field get no prefix.

8. Add an exported stats function notesCount(tasks): total number of notes across the given tasks.

9. Update parseAddCommand: a TRAILING token "!low", "!med", or "!high" sets priority: "add fix bug !high" → { title: "fix bug", priority: "high" }. No token → "med". The existing null cases stay null.

10. Update runCommand so the parsed priority is passed through to addTask. The "added #<id>" reply is unchanged.

11. REVISION of 3: the notes cap is now 5, and adding a note to a full task returns null instead of the silent no-op.

12. REVISION of 4: the note suffix is now " [n]" instead of " (n notes)": "#1 fix bug [2]".

13. Add an exported store function archive(id): marks the task archived (archived: true) and returns it, or null if missing. listTasks() and listByPriority() now exclude archived tasks by default; listTasks(true) includes them.

14. REVISION of 7: LOW-priority tasks now ALSO get a prefix, "[LOW] ". (High keeps "[HIGH] "; med still has no prefix.)

15. Add an exported store function searchNotes(query): unarchived tasks with at least one note containing the query, case-insensitively.

16. REVISION of 2: rename addNote to attachNote. Keep addNote as a working alias for backwards compatibility.

17. Add an exported stats function priorityCounts(tasks): { low, med, high } counts over the given tasks, counting only unarchived ones; tasks missing a priority field count as "med".

18. REVISION of 9: the "!priority" token may now appear ANYWHERE in the title, not just trailing. The FIRST such token is extracted and removed; the remaining words joined by single spaces form the title.

19. completeTask on an archived task now returns null (it must not complete it).

20. REVISION of 11: the notes cap is now 7. attachNote (and the addNote alias) beyond the cap returns null.

21. formatList shows "(no tasks)" when given an empty array — and runCommand("list") must show only unarchived tasks (it lists via listTasks()).

22. REVISION of 8: notesCount now counts notes on UNARCHIVED tasks only.

23. REVISION of 14 and 7: ALL priorities now get a prefix, including med: "[MED] ". Tasks missing a priority field still get no prefix.

24. runCommand supports "archive <id>": archives the task and returns "archived #<id>"; a missing or invalid id returns "unknown command".`,
  },
];

// Guard-validation variant: identical brief and grader to rung7, but the sandbox
// carries LOW-GUARD.md as its CLAUDE.md. Measures whether standing guidance
// closes the low-effort ambiguity crack without touching the prompt.
const rung7 = rungs.find((r) => r.id === "rung7-revisions");
rungs.push({
  ...rung7,
  id: "rung7-guarded",
  fixture: "fixture-guarded",
  title: "Revision Chain + low-guard (same brief, guarded CLAUDE.md)",
  axis: "does standing guidance close the ambiguity crack at low?",
});
