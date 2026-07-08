// Task packages for Low or Bust 2: Delegation.
// Package A: five INDEPENDENT steps — no step depends on another's decisions.
// Package B: five ENTANGLED steps — steps 2-5 build on the state step 1 creates.
// Briefs fully specify every contract the hidden graders check, so grading
// measures execution, not guessing. Entanglement lives in the code state:
// a fresh worker on step 3 must read what steps 1-2 actually did.

export const CONDITIONS = [
  { id: "mono-low", arm: "mono", effort: "low", label: "Monolith @ low" },
  { id: "mono-medium", arm: "mono", effort: "medium", label: "Monolith @ medium" },
  { id: "mono-high", arm: "mono", effort: "high", label: "Monolith @ high" },
  { id: "deleg-low", arm: "deleg", effort: "low", label: "Fresh workers @ low" },
  { id: "deleg-high", arm: "deleg", effort: "high", label: "Fresh workers @ high" },
];

const INTRO = `You are working on "taskboard", a small ES-module JavaScript library in the current directory (src/store.js, src/format.js, src/stats.js, src/parse.js, src/index.js, plus tests in test/). Make only the changes described. Keep all existing behavior working — the existing tests in test/baseline.test.mjs must still pass. Do not add dependencies. When you are done making the file edits, stop; do not summarize at length.`;

export const packages = [
  {
    id: "A",
    label: "Independent steps",
    intro: INTRO,
    steps: [
      {
        id: "A1",
        brief: `In src/format.js, add an exported function formatDuration(seconds) that formats a non-negative integer number of seconds as a compact duration string: hours, then minutes, then seconds, joined by single spaces, omitting any component that is zero. Examples: 45 → "45s", 125 → "2m 5s", 3600 → "1h", 3780 → "1h 3m", 3665 → "1h 1m 5s". Special case: 0 → "0s".`,
      },
      {
        id: "A2",
        brief: `src/stats.js has a bug: completionRate returns NaN when the task list is empty. Fix completionRate to return 0 for an empty list, keeping its existing correct behavior for non-empty lists.`,
      },
      {
        id: "A3",
        brief: `In src/store.js, add an exported function removeTask(id) that deletes the task with that id from the store. It returns true if a task was removed and false if no task with that id exists.`,
      },
      {
        id: "A4",
        brief: `In src/parse.js, make parseAddCommand return null when the title is empty or only whitespace (for example "add   " should return null). Normal add commands must keep working exactly as before.`,
      },
      {
        id: "A5",
        brief: `Create a new test file test/format.test.mjs using node:test and node:assert that covers formatTask and formatList from src/format.js — including formatList's empty and non-empty cases — with at least 4 assertions. It must pass when run with: node --test test/format.test.mjs`,
      },
    ],
  },
  {
    id: "B",
    label: "Entangled steps",
    intro: INTRO,
    steps: [
      {
        id: "B1",
        brief: `Add priority support to tasks in src/store.js: addTask(title, priority) where priority is one of "low", "med", or "high". When priority is omitted it defaults to "med"; any value other than those three strings also becomes "med". Every task object returned by the store now carries a priority field.`,
      },
      {
        id: "B2",
        brief: `In src/store.js, add an exported function listByPriority(priority) that returns the stored tasks whose priority field equals the argument, in insertion order (an empty array when none match).`,
      },
      {
        id: "B3",
        brief: `In src/format.js, update formatTask: a task that has a priority field is prefixed with its priority as an uppercase tag in square brackets followed by one space, before the existing output. Example: a not-done task with id 1, title "t", and priority "high" renders as "[HIGH] #1 t". Tasks that have no priority field must render exactly as before, with no prefix.`,
      },
      {
        id: "B4",
        brief: `In src/stats.js, add an exported function countByPriority(tasks) that returns an object of the shape { low, med, high } counting how many of the given tasks have each priority. Tasks that are missing a priority field count as "med".`,
      },
      {
        id: "B5",
        brief: `In src/parse.js, extend parseAddCommand to support an optional trailing "--priority <value>" flag. "add fix bug --priority high" returns { title: "fix bug", priority: "high" }. Without the flag, the result's priority defaults to "med". An invalid priority value also becomes "med". The flag text must not remain in the title.`,
      },
    ],
  },
];
