#!/usr/bin/env node
// Low or Bust — benchmark Claude Code effort levels.
//
// Usage:
//   node bench.mjs run     [--suite original|codex] [--efforts low,high] [--tasks id,id] [--category coding] [--trials 1] [--model X] [--parallel 2]
//   node bench.mjs score   [--judge-model sonnet]   (grades everything unscored; writing tasks use a blind LLM judge)
//   node bench.mjs report                            (writes the suite report HTML)
//   node bench.mjs all     (run + score + report)
//   node bench.mjs status  (what's done, what's missing)
//
// Runs are resumable: existing result files are skipped, so you can Ctrl-C and re-run.

import { execFile } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
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

const SUITES = {
  original: { file: "tasks.mjs", resultsDir: "results", reportFile: "report.html", label: "original" },
  codex: { file: "tasks-codex.mjs", resultsDir: "results-codex", reportFile: "report-codex.html", label: "codex" },
  hard: { file: "tasks-hard.mjs", resultsDir: "results-hard", reportFile: "report-hard.html", label: "hard" },
};
const suiteName = opts.suite ?? "original";
const suiteConfig = SUITES[suiteName];
if (!suiteConfig) die(`Unknown suite "${suiteName}". Valid: ${Object.keys(SUITES).join(", ")}`);

const { tasks, EFFORTS } = await import(`./${suiteConfig.file}`);
const RESULTS = join(ROOT, suiteConfig.resultsDir);
const WORKDIR = join(RESULTS, "workdir"); // empty cwd so runs don't pick up project context

const efforts = (opts.efforts ? opts.efforts.split(",") : EFFORTS).map((e) => e.trim());
const badEffort = efforts.find((e) => !EFFORTS.includes(e));
if (badEffort) die(`Unknown effort "${badEffort}". Valid: ${EFFORTS.join(", ")}`);

let suite = tasks;
if (opts.category) suite = suite.filter((t) => t.category === opts.category);
if (opts.tasks) {
  const wanted = opts.tasks.split(",").map((s) => s.trim());
  const unknown = wanted.filter((w) => !tasks.some((t) => t.id === w));
  if (unknown.length) die(`Unknown task ids: ${unknown.join(", ")}\nAvailable: ${tasks.map((t) => t.id).join(", ")}`);
  suite = suite.filter((t) => wanted.includes(t.id));
}
const trials = parseInt(opts.trials ?? "1", 10);
const parallel = Math.max(1, parseInt(opts.parallel ?? "2", 10));
const model = opts.model ?? null; // null = your session default model
const judgeModel = opts["judge-model"] ?? "sonnet";

// ------------------------------------------------------------------- helpers
function die(msg) {
  console.error(msg);
  process.exit(1);
}

function benchCommand(name) {
  return `node bench.mjs ${name}${suiteName === "original" ? "" : ` --suite ${suiteName}`}`;
}

function resultPath(taskId, effort, trial) {
  return join(RESULTS, "raw", `${taskId}__${effort}__t${trial}.json`);
}

function loadResults() {
  const dir = join(RESULTS, "raw");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

function claude(args, { timeoutMs = 20 * 60 * 1000 } = {}) {
  return new Promise((resolve) => {
    execFile(
      "claude",
      args,
      { cwd: WORKDIR, env: { ...process.env, PATH: PATH_ENV }, maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs },
      (err, stdout, stderr) => {
        let json = null;
        try {
          json = JSON.parse(stdout);
        } catch {
          /* fall through */
        }
        if (json) return resolve(json);
        resolve({ is_error: true, result: `CLI failure: ${err?.message ?? ""}\n${stderr}`.trim() });
      }
    );
  });
}

async function pool(items, limit, fn) {
  const queue = [...items.entries()];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const [i, item] = queue.shift();
      await fn(item, i);
    }
  });
  await Promise.all(workers);
}

function wordCount(text) {
  return (text.match(/\S+/g) ?? []).length;
}

// ------------------------------------------------------------------ auth gate
async function checkAuth() {
  const probe = await claude(["-p", "Reply with exactly: OK", "--model", "haiku", "--output-format", "json", "--max-turns", "1"], { timeoutMs: 120_000 });
  if (probe.is_error && /not logged in/i.test(probe.result ?? "")) {
    die("The claude CLI is not logged in.\nOpen a Terminal, run `claude`, complete the /login flow once, then re-run this benchmark.");
  }
  if (probe.is_error) die(`CLI probe failed:\n${probe.result}`);
}

// ------------------------------------------------------------------------ run
async function cmdRun() {
  mkdirSync(join(RESULTS, "raw"), { recursive: true });
  mkdirSync(WORKDIR, { recursive: true });

  const combos = [];
  for (const task of suite)
    for (const effort of efforts)
      for (let trial = 1; trial <= trials; trial++)
        if (!existsSync(resultPath(task.id, effort, trial))) combos.push({ task, effort, trial });

  const total = suite.length * efforts.length * trials;
  console.log(`Suite: ${suite.length} tasks × ${efforts.length} efforts × ${trials} trial(s) = ${total} runs (${total - combos.length} already done, ${combos.length} to go)`);
  console.log(`Task file: ${suiteConfig.file} | results: ${suiteConfig.resultsDir}`);
  if (!combos.length) return console.log("Nothing to run.");
  console.log(`Model: ${model ?? "(session default)"} | parallel: ${parallel}`);
  console.log(`Heads-up: high/xhigh/max runs can each burn a lot of usage. Ctrl-C any time — runs are resumable.\n`);
  if (opts["dry-run"]) {
    combos.forEach((c) => console.log(`  would run: ${c.task.id} @ ${c.effort} (trial ${c.trial})`));
    return;
  }

  await checkAuth();

  let done = 0;
  await pool(combos, parallel, async ({ task, effort, trial }) => {
    const started = Date.now();
    const args = ["-p", task.prompt, "--effort", effort, "--output-format", "json", "--max-turns", "1"];
    if (model) args.push("--model", model);
    const res = await claude(args);
    const record = {
      taskId: task.id,
      category: task.category,
      title: task.title,
      effort,
      trial,
      model: model ?? "session-default",
      isError: !!res.is_error,
      response: res.result ?? "",
      usage: res.usage ?? null,
      modelUsage: res.modelUsage ?? null,
      costUsd: res.total_cost_usd ?? null,
      durationMs: res.duration_ms ?? Date.now() - started,
      score: null,
    };
    writeFileSync(resultPath(task.id, effort, trial), JSON.stringify(record, null, 2));
    done++;
    const tok = record.usage?.output_tokens ?? "?";
    console.log(`[${done}/${combos.length}] ${task.id} @ ${effort.padEnd(6)} ${record.isError ? "ERROR" : "ok"}  ${tok} out-tokens, ${Math.round(record.durationMs / 1000)}s`);
  });
  console.log(`\nRun phase complete. Next: ${benchCommand("score")}`);
}

// -------------------------------------------------------------------- scoring
function extractCodeBlock(text) {
  const blocks = [...text.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  return blocks.length ? blocks[blocks.length - 1] : null;
}

function scoreCoding(task, record) {
  const code = extractCodeBlock(record.response);
  if (!code) return { score: 0, detail: "no code block found in response" };
  const modFile = join(WORKDIR, `mod-${task.id}-${record.effort}-${record.trial}.cjs`);
  const testFile = join(WORKDIR, `test-${task.id}-${record.effort}-${record.trial}.cjs`);
  writeFileSync(modFile, `${code}\nmodule.exports = { ${task.exports.join(", ")} };\n`);
  writeFileSync(
    testFile,
    `const { ${task.exports.join(", ")} } = require(${JSON.stringify(modFile)});
let pass = 0, total = 0;
// canon deep-sorts object keys so grading measures logic, not property-order luck
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  return v;
}
function check(fn, expected) {
  total++;
  try { if (JSON.stringify(canon(fn())) === JSON.stringify(canon(expected))) pass++; } catch (e) {}
}
${task.testScript}
console.log(JSON.stringify({ pass, total }));
`
  );
  return new Promise((resolve) => {
    execFile("node", [testFile], { timeout: 10_000, env: { ...process.env, PATH: PATH_ENV } }, (err, stdout) => {
      rmSync(modFile, { force: true });
      rmSync(testFile, { force: true });
      try {
        const { pass, total } = JSON.parse(stdout.trim().split("\n").pop());
        resolve({ score: Math.round((pass / total) * 100), detail: `${pass}/${total} tests passed` });
      } catch {
        resolve({ score: 0, detail: `test run crashed: ${(err?.message ?? "").slice(0, 200)}` });
      }
    });
  });
}

function scoreReasoning(task, record) {
  const matches = [...record.response.matchAll(/ANSWER:\s*(.+)/gi)];
  if (!matches.length) return { score: 0, detail: "no ANSWER: line" };
  const given = matches[matches.length - 1][1].trim().toLowerCase();
  let correct;
  if (task.answerType === "number") {
    const num = given.match(/-?\d+(\.\d+)?/);
    correct = !!num && num[0] === task.answer;
  } else {
    correct = given.includes(task.answer);
  }
  return { score: correct ? 100 : 0, detail: `answered "${given}", expected "${task.answer}"` };
}

async function scoreWriting(task, record) {
  const words = wordCount(record.response);
  const rubricText = task.rubric.map((r, i) => `${i + 1}. ${r.criterion}: ${r.desc}`).join("\n");
  const judgePrompt = `You are grading an anonymous response to a writing task. Be a tough, consistent grader — a 9 or 10 should be rare.

THE TASK GIVEN:
${task.prompt}

THE RESPONSE (measured length: ${words} words):
---
${record.response}
---

Score each criterion from 0 to 10:
${rubricText}

Reply with ONLY a JSON object, no markdown fences, in this shape:
{"scores": [{"criterion": "<name>", "score": <0-10>}], "note": "<one sentence>"}`;

  const res = await claude(["-p", judgePrompt, "--model", judgeModel, "--effort", "medium", "--output-format", "json", "--max-turns", "1"], { timeoutMs: 5 * 60 * 1000 });
  if (res.is_error) return { score: null, detail: `judge error: ${(res.result ?? "").slice(0, 200)}` };
  let parsed = null;
  try {
    const raw = res.result.match(/\{[\s\S]*\}/);
    parsed = raw ? JSON.parse(raw[0]) : null;
  } catch {}
  if (!parsed?.scores?.length) return { score: null, detail: "judge reply unparseable" };
  const avg = parsed.scores.reduce((s, x) => s + Number(x.score || 0), 0) / parsed.scores.length;
  return {
    score: Math.round(avg * 10),
    detail: parsed.scores.map((s) => `${s.criterion}: ${s.score}/10`).join(", ") + (parsed.note ? ` — ${parsed.note}` : ""),
  };
}

async function cmdScore() {
  mkdirSync(WORKDIR, { recursive: true });
  const dir = join(RESULTS, "raw");
  if (!existsSync(dir)) die(`No results yet - run \`${benchCommand("run")}\` first.`);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (!files.length) return console.log(`No result files yet. Next: ${benchCommand("run")}`);
  const unscored = [];
  for (const f of files) {
    const record = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (record.score === null && !record.isError) unscored.push({ f, record });
    if (record.isError && record.score === null) {
      record.score = 0;
      record.scoreDetail = "run errored";
      writeFileSync(join(dir, f), JSON.stringify(record, null, 2));
    }
  }
  if (!unscored.length) return console.log(`Everything already scored. Next: ${benchCommand("report")}`);
  console.log(`Scoring ${unscored.length} results (writing tasks use blind judge: ${judgeModel} @ medium)...`);

  const needsJudge = unscored.some(({ record }) => record.category === "writing");
  if (needsJudge) await checkAuth();

  await pool(unscored, parallel, async ({ f, record }) => {
    const task = tasks.find((t) => t.id === record.taskId);
    let result;
    if (task.category === "coding") result = await scoreCoding(task, record);
    else if (task.category === "reasoning") result = scoreReasoning(task, record);
    else result = await scoreWriting(task, record);
    record.score = result.score;
    record.scoreDetail = result.detail;
    writeFileSync(join(dir, f), JSON.stringify(record, null, 2));
    console.log(`  ${record.taskId} @ ${record.effort.padEnd(6)} → ${result.score === null ? "unscored (judge failed, re-run score)" : result.score + "/100"}  (${result.detail.slice(0, 90)})`);
  });
  console.log(`\nScore phase complete. Next: ${benchCommand("report")}`);
}

// --------------------------------------------------------------------- report
async function cmdReport() {
  const { buildReport } = await import("./report.mjs");
  const results = loadResults().filter((r) => r.score !== null);
  if (!results.length) die(`No scored results - run \`${benchCommand("run")}\` then \`${benchCommand("score")}\` first.`);
  const html = buildReport(results);
  const out = join(ROOT, suiteConfig.reportFile);
  writeFileSync(out, html);
  console.log(`Report written to ${out} — open it in a browser.`);
}

// --------------------------------------------------------------------- status
function cmdStatus() {
  const results = loadResults();
  console.log(`Suite: ${suiteConfig.label} (${suiteConfig.file})`);
  console.log(`Results dir: ${suiteConfig.resultsDir}`);
  console.log(`Results on disk: ${results.length}`);
  for (const task of tasks) {
    const row = EFFORTS.map((e) => {
      const rs = results.filter((r) => r.taskId === task.id && r.effort === e);
      if (!rs.length) return "·";
      if (rs.some((r) => r.score === null)) return "▫";
      return "■";
    }).join(" ");
    console.log(`  ${row}  ${task.id} (${task.category})`);
  }
  console.log("  ■ scored  ▫ run, unscored  · not run   (columns: " + EFFORTS.join(" ") + ")");
}

// ----------------------------------------------------------------------- main
const commands = {
  run: cmdRun,
  score: cmdScore,
  report: cmdReport,
  status: cmdStatus,
  all: async () => {
    await cmdRun();
    await cmdScore();
    await cmdReport();
  },
};
if (!commands[command]) {
  console.log("Commands: run | score | report | status | all");
  console.log("Options:  --suite original|codex  --efforts low,medium,high,xhigh,max  --tasks id,id");
  console.log("          --category coding|reasoning|writing  --trials N  --parallel N  --model X");
  console.log("          --judge-model sonnet  --dry-run");
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
