#!/usr/bin/env node
// Low or Bust 4: Amnesia — multi-session work where the context window dies
// between sittings and only on-disk artifacts survive.
//
//   node amnesia.mjs run    [--conditions notes,nonotes,monolith] [--trials 2] [--model fable] [--effort low]
//   node amnesia.mjs status
//
// One persistent sandbox per cell. Fresh headless sessions ("sittings") work
// on it in sequence; each sitting receives ONLY its own work order. Work order
// #3 revises decisions made in work order #1 without restating them — the
// sitting applying the revision never saw the original.
//
// Conditions:
//   notes    — sittings maintain a NOTES.md handoff file for their successor
//   nonotes  — handoff files forbidden (and deleted between sittings); only code survives
//   monolith — one session receives all three work orders at once (context-survives control)

import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync, cpSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(ROOT, "results-amnesia");
// Sandboxes live OUTSIDE the project tree so headless sessions inherit no
// project identity: no repo, no auto-memory index, no relative path back to
// fixtures or hidden graders (leak found + closed 2026-07-08).
const SANDBOX_ROOT = join(tmpdir(), "lob-sandboxes", "results-amnesia");
const PATH_ENV = `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`;

const WO1 = `WORK ORDER #1 — Reminders. (This is the first of several work orders that will arrive on this codebase over time.)

1. Every task object gains a reminders field: an array of "YYYY-MM-DD" date strings, empty for new tasks. addTask keeps its signature.
2. Add an exported store function addReminder(id, date): appends the date to that task's reminders and returns the updated task. A missing id OR a date not exactly matching YYYY-MM-DD returns null.
3. A task holds at most 3 reminders. addReminder on a full task is a silent no-op: it returns the task unchanged.
4. Add an exported store function nextReminder(id): the earliest reminder date on that task, or null if the task is missing or has no reminders.
5. Update formatTask: a task with at least one reminder gets a suffix of a space, the alarm symbol ⏰, then the reminder count, e.g. "#1 pay rent ⏰2". No reminders → format exactly as before.`;

const WO2 = `WORK ORDER #2 — building on the reminder work from the previous work order.

6. Add an exported stats function reminderLoad(tasks): the total number of reminders across the given tasks, counting only tasks that are not done.
7. Update parseAddCommand: a trailing "remind <date>" clause sets a reminder field on the result: "add pay rent remind 2026-07-08" → { title: "pay rent", reminder: "2026-07-08" }. Use the SAME date validation the reminder feature already uses; an invalid date means those words simply stay in the title and reminder is null. No remind clause → reminder: null. The existing null cases stay null.
8. Update runCommand so a parsed reminder is stored on the newly added task through the reminder feature's normal add path. The "added #<id>" reply is unchanged.
9. Add an exported store function clearReminders(id): empties that task's reminders and returns it, or null if the task doesn't exist.`;

const WO3 = `WORK ORDER #3 — revisions to earlier work orders. Where this contradicts them, this wins.

10. REVISION: raise the per-task reminder cap you were given in work order #1 by 2. The at-cap behavior is unchanged.
11. REVISION: formatTask keeps the same reminder symbol, but now shows the task's EARLIEST reminder date instead of the count: "#1 pay rent ⏰2026-07-08". No reminders → unchanged, as before.
12. REVISION: the parser's "remind <date>" clause may now appear ANYWHERE in the title, not just trailing. The first valid clause is extracted and removed; the remaining words joined by single spaces form the title.
13. completeTask now also clears the task's reminders (it still marks done and returns the task as before).
14. runCommand gains "remind <id> <date>": adds a reminder to that task and returns "ok #<id>". If the task is already at its reminder cap, return "full #<id>". A missing task or an invalid date returns "unknown command".`;

const BASE = `You are working on "taskboard", a small ES-module JavaScript library in the current directory (src/store.js, src/format.js, src/stats.js, src/parse.js, src/index.js, tests in test/). Keep test/baseline.test.mjs passing. Do not add dependencies.`;

const AMNESIA = `You are one of several engineers who work on this repo in short sittings. You have NO memory of previous sittings, and whoever works the next sitting will have no memory of this one. Only what is on disk survives.`;

const NOTES_PROTOCOL = `A NOTES.md at the repo root is the team's handoff file. FIRST: read NOTES.md if it exists and orient yourself. LAST, before you finish: rewrite NOTES.md so an engineer with zero context can continue — what has been built, every key decision and its CURRENT value (caps, formats, symbols, field names), and anything a future work order might revise.`;

const NO_NOTES = `Handoff or notes files are FORBIDDEN in this repo — do not create NOTES.md or any similar documentation-of-work file. The code and tests themselves are the only record.`;

const CONDITIONS = {
  notes: { sittings: [WO1, WO2, WO3], preamble: `${BASE}\n\n${AMNESIA}\n\n${NOTES_PROTOCOL}` },
  nonotes: { sittings: [WO1, WO2, WO3], preamble: `${BASE}\n\n${AMNESIA}\n\n${NO_NOTES}` },
  monolith: { sittings: [`${WO1}\n\n${WO2}\n\n${WO3}`], preamble: `${BASE}\n\nImplement ALL of the following work orders, in order. Later work orders revise earlier ones — the final code must reflect the latest revision of every rule.` },
};

const [, , command = "help", ...rest] = process.argv;
const opts = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) {
    const key = rest[i].slice(2);
    const val = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : "true";
    opts[key] = val;
  }
}
const die = (m) => { console.error(m); process.exit(1); };
const model = opts.model ?? "fable";
const effort = opts.effort ?? "low";
const trials = parseInt(opts.trials ?? "2", 10);
const wanted = (opts.conditions ?? "notes,nonotes,monolith").split(",").map((s) => s.trim());
const recPath = (cond, trial) => join(RESULTS, "raw", `${cond}__${effort}__t${trial}.json`);

function claudeCall(prompt, cwd) {
  const args = ["-p", prompt, "--model", model, "--effort", effort, "--output-format", "json",
    "--max-turns", "40", "--dangerously-skip-permissions", "--allowedTools", "Read,Edit,Write,Glob,Grep"];
  return new Promise((resolve) => {
    execFile("claude", args, { cwd, env: { ...process.env, PATH: PATH_ENV }, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (err, stdout, stderr) => {
      try {
        const j = JSON.parse(stdout);
        resolve({ isError: !!j.is_error, tokens: j.usage?.output_tokens ?? 0, durationMs: j.duration_ms ?? 0, numTurns: j.num_turns ?? 0 });
      } catch {
        resolve({ isError: true, tokens: 0, durationMs: 0, numTurns: 0, error: `CLI failure: ${err?.message ?? ""} ${stderr}`.slice(0, 300) });
      }
    });
  });
}

function grade(sandbox) {
  try {
    const out = execFileSync("node", [join(ROOT, "hidden", "grade-amnesia.mjs"), sandbox], { encoding: "utf8", timeout: 120_000, env: { ...process.env, PATH: PATH_ENV } });
    return JSON.parse(out.trim().split("\n").pop());
  } catch (e) {
    return { steps: [], pass: 0, total: 1, gradeError: String(e.message).slice(0, 200) };
  }
}

async function runCell(cond, trial) {
  const spec = CONDITIONS[cond];
  const sandbox = join(SANDBOX_ROOT, `${cond}__${effort}__t${trial}`);
  rmSync(sandbox, { recursive: true, force: true });
  cpSync(join(ROOT, "fixture"), sandbox, { recursive: true });
  const sittings = [];
  for (let i = 0; i < spec.sittings.length; i++) {
    const label = spec.sittings.length > 1 ? `This sitting's work order (#${i + 1} of an unknown series):` : "";
    const brief = `${spec.preamble}\n\n${label}\n\n${spec.sittings[i]}`.trim();
    const call = await claudeCall(brief, sandbox);
    if (cond === "nonotes") rmSync(join(sandbox, "NOTES.md"), { force: true });
    const notesFile = join(sandbox, "NOTES.md");
    sittings.push({ sitting: i + 1, tokens: call.tokens, durationMs: call.durationMs, numTurns: call.numTurns,
      notesBytes: existsSync(notesFile) ? statSync(notesFile).size : 0,
      callError: call.isError ? call.error ?? "call errored" : null });
    console.log(`    sitting ${i + 1}: ${call.tokens} tokens, ${call.numTurns} turns, ${Math.round(call.durationMs / 1000)}s${call.isError ? "  [CALL ERROR]" : ""}`);
  }
  const g = grade(sandbox);
  const record = {
    condition: cond, effort, trial, model,
    score: Math.round((g.pass / g.total) * 100), gradePass: g.pass, gradeTotal: g.total,
    gradeSteps: g.steps, gradeError: g.gradeError ?? null,
    sittings, totalTokens: sittings.reduce((a, s) => a + s.tokens, 0),
    note: "LOW-GUARD v2 present as global ~/.claude/CLAUDE.md for ALL cells — constant across conditions, so between-condition comparisons are unconfounded",
  };
  writeFileSync(recPath(cond, trial), JSON.stringify(record, null, 2));
  console.log(`  ■ ${cond} t${trial}: ${record.score}/100 (${g.pass}/${g.total}), ${record.totalTokens} tokens total`);
}

async function cmdRun() {
  mkdirSync(join(RESULTS, "raw"), { recursive: true });
  mkdirSync(SANDBOX_ROOT, { recursive: true });
  for (const cond of wanted) {
    if (!CONDITIONS[cond]) die(`Unknown condition "${cond}". Available: ${Object.keys(CONDITIONS).join(", ")}`);
    for (let t = 1; t <= trials; t++) {
      if (existsSync(recPath(cond, t))) { console.log(`▲ ${cond} t${t}: already done — skipping.`); continue; }
      console.log(`\n▶ ${cond} @ ${effort} t${t}`);
      await runCell(cond, t);
    }
  }
  console.log(`\nAmnesia complete. node amnesia.mjs status`);
}

function cmdStatus() {
  const dir = join(RESULTS, "raw");
  const recs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8"))) : [];
  for (const cond of Object.keys(CONDITIONS)) {
    const rs = recs.filter((r) => r.condition === cond).sort((a, b) => a.trial - b.trial);
    if (!rs.length) { console.log(`  · ${cond} — not run`); continue; }
    console.log(`  ${cond}: scores [${rs.map((r) => r.score).join(", ")}], tokens [${rs.map((r) => r.totalTokens).join(", ")}]`);
  }
}

const commands = { run: cmdRun, status: cmdStatus };
if (!commands[command]) {
  console.log("Commands: run | status");
  console.log("Options:  --conditions notes,nonotes,monolith  --trials 2  --model fable  --effort low");
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
