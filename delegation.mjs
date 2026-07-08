#!/usr/bin/env node
// Low or Bust 2: Delegation — monolithic long-context agent vs fresh low-effort workers.
//
//   node delegation.mjs run    [--packages A,B] [--conditions mono-low,deleg-low] [--trials 3]
//                              [--model fable] [--parallel 2] [--dry-run]
//   node delegation.mjs status
//   node delegation.mjs report            (writes report-delegation.html)
//
// Each cell: copy fixture/ to a sandbox, let the agent(s) edit it with real tools,
// then grade the sandbox with the hidden test suite. Grading is objective and
// happens inline — no LLM judge. Runs are resumable per cell.

import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { packages, CONDITIONS } from "./packages.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(ROOT, "fixture");
const RESULTS = join(ROOT, "results-delegation");
const PATH_ENV = `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`;

// ---------------------------------------------------------------- cli parsing
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

const pkgIds = (opts.packages ? opts.packages.split(",") : packages.map((p) => p.id)).map((s) => s.trim());
const suitePkgs = packages.filter((p) => pkgIds.includes(p.id));
if (!suitePkgs.length) die(`No packages match "${opts.packages}". Available: ${packages.map((p) => p.id).join(", ")}`);

const condIds = (opts.conditions ? opts.conditions.split(",") : CONDITIONS.map((c) => c.id)).map((s) => s.trim());
const conds = CONDITIONS.filter((c) => condIds.includes(c.id));
if (!conds.length) die(`No conditions match "${opts.conditions}". Available: ${CONDITIONS.map((c) => c.id).join(", ")}`);

const trials = parseInt(opts.trials ?? "3", 10);
const parallel = Math.max(1, parseInt(opts.parallel ?? "2", 10));
const model = opts.model ?? "fable";

// ------------------------------------------------------------------- helpers
const recPath = (key) => join(RESULTS, "raw", `${key}.json`);

function loadResults() {
  const dir = join(RESULTS, "raw");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

function agentCall(prompt, effort, sandbox) {
  const args = [
    "-p", prompt,
    "--model", model,
    "--effort", effort,
    "--output-format", "json",
    "--max-turns", "40",
    "--dangerously-skip-permissions",
    "--allowedTools", "Read,Edit,Write,Glob,Grep",
  ];
  return new Promise((resolve) => {
    execFile("claude", args, { cwd: sandbox, env: { ...process.env, PATH: PATH_ENV }, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (err, stdout, stderr) => {
      try {
        const j = JSON.parse(stdout);
        resolve({ isError: !!j.is_error, tokens: j.usage?.output_tokens ?? 0, durationMs: j.duration_ms ?? 0, numTurns: j.num_turns ?? 0, modelUsage: j.modelUsage ?? null });
      } catch {
        resolve({ isError: true, tokens: 0, durationMs: 0, numTurns: 0, error: `CLI failure: ${err?.message ?? ""} ${stderr}`.slice(0, 300) });
      }
    });
  });
}

function gradeSandbox(pkgId, sandbox) {
  try {
    const out = execFileSync("node", [join(ROOT, "hidden", `grade-${pkgId}.mjs`), sandbox], { encoding: "utf8", timeout: 120_000, env: { ...process.env, PATH: PATH_ENV } });
    return JSON.parse(out.trim().split("\n").pop());
  } catch (e) {
    return { steps: [], pass: 0, total: 1, gradeError: String(e.message).slice(0, 200) };
  }
}

async function pool(items, limit, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

// ------------------------------------------------------------------------ run
async function runCell({ pkg, cond, trial }) {
  const key = `${pkg.id}__${cond.id}__t${trial}`;
  const sandbox = join(RESULTS, "sandboxes", key);
  rmSync(sandbox, { recursive: true, force: true });
  cpSync(FIXTURE, sandbox, { recursive: true });

  const calls = [];
  const started = Date.now();
  if (cond.arm === "mono") {
    const prompt = `${pkg.intro}\n\nComplete ALL ${pkg.steps.length} of the following changes:\n\n${pkg.steps.map((s, i) => `${i + 1}. ${s.brief}`).join("\n\n")}`;
    calls.push({ step: "all", ...(await agentCall(prompt, cond.effort, sandbox)) });
  } else {
    for (const s of pkg.steps) {
      calls.push({ step: s.id, ...(await agentCall(`${pkg.intro}\n\nMake this one change:\n\n${s.brief}`, cond.effort, sandbox)) });
    }
  }
  const grade = gradeSandbox(pkg.id, sandbox);
  const record = {
    key, package: pkg.id, condition: cond.id, arm: cond.arm, effort: cond.effort, trial, model,
    score: Math.round((grade.pass / grade.total) * 100),
    gradePass: grade.pass, gradeTotal: grade.total, gradeSteps: grade.steps, gradeError: grade.gradeError ?? null,
    tokens: calls.reduce((a, c) => a + c.tokens, 0),
    durationMs: Date.now() - started,
    anyCallError: calls.some((c) => c.isError),
    calls,
  };
  writeFileSync(recPath(key), JSON.stringify(record, null, 2));
  console.log(`  ${key}: ${record.score}/100 (${grade.pass}/${grade.total} checks), ${record.tokens} tokens, ${Math.round(record.durationMs / 1000)}s${record.anyCallError ? "  [call errors]" : ""}`);
}

async function cmdRun() {
  mkdirSync(join(RESULTS, "raw"), { recursive: true });
  mkdirSync(join(RESULTS, "sandboxes"), { recursive: true });
  const cells = [];
  for (const pkg of suitePkgs)
    for (const cond of conds)
      for (let trial = 1; trial <= trials; trial++)
        if (!existsSync(recPath(`${pkg.id}__${cond.id}__t${trial}`))) cells.push({ pkg, cond, trial });

  const total = suitePkgs.length * conds.length * trials;
  console.log(`Delegation grid: ${suitePkgs.length} packages × ${conds.length} conditions × ${trials} trials = ${total} cells (${total - cells.length} done, ${cells.length} to go)`);
  console.log(`Model: ${model} | parallel: ${parallel}`);
  console.log(`These are AGENTIC runs (multi-turn, tool use) — much heavier than the one-shot suites.\n`);
  if (opts["dry-run"]) { cells.forEach((c) => console.log(`  would run: ${c.pkg.id}__${c.cond.id}__t${c.trial} (${c.cond.arm === "mono" ? 1 : c.pkg.steps.length} agent call(s))`)); return; }
  if (!cells.length) return console.log("Nothing to run.");
  await pool(cells, parallel, runCell);
  console.log("\nRun phase complete (grading was inline). Next: node delegation.mjs report");
}

// --------------------------------------------------------------------- status
function cmdStatus() {
  const results = loadResults();
  console.log(`Cells on disk: ${results.length}`);
  for (const pkg of packages) {
    for (const cond of CONDITIONS) {
      const rs = results.filter((r) => r.package === pkg.id && r.condition === cond.id);
      if (rs.length) console.log(`  ${pkg.id} ${cond.id.padEnd(12)} n=${rs.length}  mean score ${Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length)}  mean tokens ${Math.round(rs.reduce((a, r) => a + r.tokens, 0) / rs.length)}`);
    }
  }
}

// --------------------------------------------------------------------- report
async function cmdReport() {
  const { buildDelegationReport } = await import("./report-delegation.mjs");
  const results = loadResults();
  if (!results.length) die("No results — run `node delegation.mjs run` first.");
  writeFileSync(join(ROOT, "report-delegation.html"), buildDelegationReport(results));
  console.log(`Report written to ${join(ROOT, "report-delegation.html")}`);
}

const commands = { run: cmdRun, status: cmdStatus, report: cmdReport };
if (!commands[command]) {
  console.log("Commands: run | status | report");
  console.log("Options:  --packages A,B  --conditions mono-low,...  --trials 3  --model fable  --parallel 2  --dry-run");
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
