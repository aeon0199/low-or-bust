#!/usr/bin/env node
// The Gauntlet — push LOW effort up a difficulty ladder until it cracks.
//
//   node gauntlet.mjs run     [--rungs rung1-discovery,...] [--model fable] [--dry-run]
//   node gauntlet.mjs status
//   node gauntlet.mjs report            (writes report-gauntlet.html)
//
// Protocol per rung: ONE run at low. Pass (score 100) → climb. Fail → spend
// where it's informative: two more low trials (noise or wall?) plus one high
// trial (effort wall or capability wall?). Then climb regardless — rungs are
// independent. Records are resumable.

import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rungs } from "./rungs.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(ROOT, "results-gauntlet");
const PATH_ENV = `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`;

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
const wanted = opts.rungs ? opts.rungs.split(",").map((s) => s.trim()) : rungs.map((r) => r.id);
const suite = rungs.filter((r) => wanted.includes(r.id));
if (!suite.length) die(`No rungs match. Available: ${rungs.map((r) => r.id).join(", ")}`);

const recPath = (rungId, effort, trial) => join(RESULTS, "raw", `${rungId}__${effort}__t${trial}.json`);

function loadResults() {
  const dir = join(RESULTS, "raw");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

function claudeCall(prompt, effort, { cwd, agentic }) {
  const args = ["-p", prompt, "--model", model, "--effort", effort, "--output-format", "json"];
  if (agentic) args.push("--max-turns", "40", "--dangerously-skip-permissions", "--allowedTools", "Read,Edit,Write,Glob,Grep");
  else args.push("--max-turns", "1");
  return new Promise((resolve) => {
    execFile("claude", args, { cwd, env: { ...process.env, PATH: PATH_ENV }, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (err, stdout, stderr) => {
      try {
        const j = JSON.parse(stdout);
        resolve({ isError: !!j.is_error, response: j.result ?? "", tokens: j.usage?.output_tokens ?? 0, durationMs: j.duration_ms ?? 0, numTurns: j.num_turns ?? 0 });
      } catch {
        resolve({ isError: true, response: "", tokens: 0, durationMs: 0, numTurns: 0, error: `CLI failure: ${err?.message ?? ""} ${stderr}`.slice(0, 300) });
      }
    });
  });
}

function gradeAgentic(rung, sandbox) {
  try {
    const out = execFileSync("node", [join(ROOT, rung.grader), sandbox], { encoding: "utf8", timeout: 120_000, env: { ...process.env, PATH: PATH_ENV } });
    return JSON.parse(out.trim().split("\n").pop());
  } catch (e) {
    return { steps: [], pass: 0, total: 1, gradeError: String(e.message).slice(0, 200) };
  }
}

function gradeOneshot(rung, response) {
  const clean = (s) => String(s).toLowerCase().replace(/[\s\[\]()"'`]/g, "");
  const steps = [];
  for (const [num, expected] of Object.entries(rung.answers)) {
    const m = response.match(new RegExp(`ANSWER${num}:\\s*(.+)`, "i"));
    const given = m ? clean(m[1]) : "(missing)";
    const want = clean(expected);
    const ok = given === want || given.replace(/,/g, "") === want.replace(/,/g, "");
    steps.push({ step: `snippet ${num}`, pass: ok ? 1 : 0, total: 1, detail: ok ? [] : [`answered "${given}", expected "${want}"`] });
  }
  const pass = steps.reduce((a, s) => a + s.pass, 0);
  return { steps, pass, total: steps.length };
}

async function runTrial(rung, effort, trial) {
  const started = Date.now();
  let call, grade, sandbox = null;
  if (rung.kind === "agentic") {
    sandbox = join(RESULTS, "sandboxes", `${rung.id}__${effort}__t${trial}`);
    rmSync(sandbox, { recursive: true, force: true });
    cpSync(join(ROOT, rung.fixture), sandbox, { recursive: true });
    call = await claudeCall(rung.brief, effort, { cwd: sandbox, agentic: true });
    grade = gradeAgentic(rung, sandbox);
  } else {
    call = await claudeCall(rung.brief, effort, { cwd: ROOT, agentic: false });
    grade = gradeOneshot(rung, call.response);
  }
  const record = {
    rung: rung.id, title: rung.title, axis: rung.axis, effort, trial, model,
    score: Math.round((grade.pass / grade.total) * 100),
    gradePass: grade.pass, gradeTotal: grade.total, gradeSteps: grade.steps, gradeError: grade.gradeError ?? null,
    tokens: call.tokens, durationMs: Date.now() - started, numTurns: call.numTurns,
    callError: call.isError ? call.error ?? "call errored" : null,
  };
  writeFileSync(recPath(rung.id, effort, trial), JSON.stringify(record, null, 2));
  console.log(`  ${rung.id} @ ${effort} t${trial}: ${record.score}/100 (${grade.pass}/${grade.total}), ${call.tokens} tokens, ${Math.round(record.durationMs / 1000)}s${record.callError ? "  [CALL ERROR]" : ""}`);
  return record;
}

const passed = (r) => r.score === 100 && !r.callError;

async function cmdRun() {
  mkdirSync(join(RESULTS, "raw"), { recursive: true });
  mkdirSync(join(RESULTS, "sandboxes"), { recursive: true });
  for (const rung of suite) {
    const existing = loadResults().filter((r) => r.rung === rung.id);
    if (existing.some(passed) && existing.some((r) => r.effort === "low")) {
      console.log(`▲ ${rung.id}: already passed at low — climbing on.`);
      continue;
    }
    console.log(`\n▶ ${rung.id} — ${rung.title}`);
    if (opts["dry-run"]) { console.log(`  would run: low t1 (then, only on failure: low t2, low t3, high t1)`); continue; }

    if (opts["force-trials"]) {
      const n = parseInt(opts["force-trials"], 10);
      for (let t = 1; t <= n; t++) if (!existsSync(recPath(rung.id, "low", t))) await runTrial(rung, "low", t);
      const rs = loadResults().filter((r) => r.rung === rung.id && r.effort === "low");
      console.log(`  📊 forced ${n} low trials: [${rs.sort((a, b) => a.trial - b.trial).map((r) => r.score).join(", ")}]`);
      continue;
    }

    const lowTrials = existing.filter((r) => r.effort === "low");
    let first = lowTrials.find((r) => r.trial === 1) ?? (await runTrial(rung, "low", 1));
    if (passed(first)) { console.log(`  ✅ passed at low — climbing.`); continue; }

    console.log(`  ✗ low failed (${first.score}/100) — probing the crack...`);
    for (const t of [2, 3]) {
      if (!existsSync(recPath(rung.id, "low", t))) await runTrial(rung, "low", t);
    }
    if (!existsSync(recPath(rung.id, "high", 1))) await runTrial(rung, "high", 1);
    const all = loadResults().filter((r) => r.rung === rung.id);
    const lowScores = all.filter((r) => r.effort === "low").map((r) => r.score);
    const high = all.find((r) => r.effort === "high");
    console.log(`  📌 crack profile: low [${lowScores.join(", ")}], high ${high?.score ?? "?"} → ${high && passed(high) ? "EFFORT wall" : "capability wall (high fails too)"}`);
  }
  console.log(`\nGauntlet complete. Next: node gauntlet.mjs report`);
}

function cmdStatus() {
  const results = loadResults();
  console.log(`Records: ${results.length}`);
  for (const rung of rungs) {
    const rs = results.filter((r) => r.rung === rung.id);
    if (!rs.length) { console.log(`  · ${rung.id} — not run`); continue; }
    const lows = rs.filter((r) => r.effort === "low").map((r) => `${r.score}`);
    const high = rs.find((r) => r.effort === "high");
    console.log(`  ${rs.some(passed) ? "✅" : "✗"} ${rung.id} — low [${lows.join(", ")}]${high ? ` high [${high.score}]` : ""}`);
  }
}

async function cmdReport() {
  const { buildGauntletReport } = await import("./report-gauntlet.mjs");
  const results = loadResults();
  if (!results.length) die("No results — run `node gauntlet.mjs run` first.");
  writeFileSync(join(ROOT, "report-gauntlet.html"), buildGauntletReport(results));
  console.log(`Report written to ${join(ROOT, "report-gauntlet.html")}`);
}

const commands = { run: cmdRun, status: cmdStatus, report: cmdReport };
if (!commands[command]) {
  console.log("Commands: run | status | report");
  console.log("Options:  --rungs id,id  --model fable  --dry-run");
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
