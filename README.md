# Low or Bust 🐌⚡

**Which Claude Code effort level is actually worth it?** We benchmarked it seven different ways trying to make `low` crack — ~180 runs, two frontier models, four suites, a seven-rung gauntlet, and an independent cross-vendor replication. It cost us one checkmark, and that checkmark turned out to be our own ambiguous sentence.

**📖 Read the full story: [WRITEUP.md](WRITEUP.md)** — the question, the instrument, the escalations, the crack, the replication that caught the benchmark's own bug, and the measured fix.

**🛡️ Just want the fix? [LOW-GUARD-v2.md](LOW-GUARD-v2.md)** — a six-rule block for your `CLAUDE.md`/`AGENTS.md` that closed the only failure we ever measured at low effort (validated: un-guarded low scored 96,100,100 on the cracking rung; guarded low scored 100,100,100,100). Works for any agent that reads an agents file.

Everything below documents the instrument itself — every claim in the writeup traces to a runnable command and a raw result JSON in this repo.

---

This benchmark runs the same task suite at every effort level (`low → medium → high → xhigh → max`) through headless `claude -p` sessions, measures exactly what each run cost (output tokens, time), grades the results, and tells you where the quality-per-token sweet spot is.

- **Coding** tasks are graded objectively — the returned code is executed against embedded tests.
- **Reasoning** tasks are graded objectively — the final `ANSWER:` line is compared to the known answer.
- **Writing** tasks are graded by a **blind LLM judge** (it never sees which effort level produced the response).

## One-time setup

1. `npm install -g @anthropic-ai/claude-code` (already done if you're reading this)
2. Open Terminal, run `claude`, and complete the login flow once. The benchmark uses your normal subscription.

## Run it

```bash
node bench.mjs all            # run everything, grade, build report.html
open report.html
```

There is also a harder Codex-authored practical builder suite that keeps the
same one-shot benchmark shape but swaps in messier real-world tasks:

```bash
node bench.mjs all --suite codex --efforts low,medium,high,xhigh
open report-codex.html
```

The original suite stays the default and writes to `results/` + `report.html`.
The Codex suite writes separately to `results-codex/` + `report-codex.html`.
Use the same `--suite codex` flag for `run`, `score`, `report`, `status`, or
`all` when you are working with that suite.

There is also a Fable-authored hard suite (`--suite hard` → `results-hard/` +
`report-hard.html`) where every task has a deliberate trap: greedy/naive
approaches fail hidden test structure, intuitive answers are wrong (all
reasoning answers brute-force verified), and writing briefs stack simultaneous
hard constraints. This is the tier designed to make effort levels actually
separate. Note: coding grades are key-order-insensitive (object keys are
canonicalized before comparison) so grading measures logic, not luck.

Or step by step / partially:

```bash
node bench.mjs run --efforts low,medium,high     # skip the expensive ones
node bench.mjs run --suite codex                 # use the harder practical suite
node bench.mjs run --category coding             # one category only
node bench.mjs run --tasks reason-snail-pole     # one task
node bench.mjs run --trials 3                    # repeat runs to smooth out variance
node bench.mjs status                            # what's done so far
node bench.mjs score                             # grade unscored runs
node bench.mjs report                            # rebuild report.html
```

Useful flags: `--model opus` (default: your session default), `--judge-model sonnet`, `--parallel 2`, `--dry-run`.

## Low or Bust 2: Delegation

A second experiment answering: for multi-step coding work, is one long-context
agent better than an orchestrator dispatching **fresh workers at low effort**?

```bash
node delegation.mjs run              # 2 packages × 5 conditions × 3 trials = 30 agentic cells
node delegation.mjs status
node delegation.mjs report           # writes report-delegation.html
```

Agents get real tools (Read/Edit/Write/Glob/Grep, no shell) inside a sandboxed
copy of `fixture/` (a small task-tracker library), then the sandbox is graded
by hidden tests in `hidden/` that agents never see. Package A's five steps are
independent; Package B's five steps depend on each other's decisions — the
coupling axis is the experiment. Conditions: monolith at low/medium/high vs
per-step fresh workers at low/high. Grading is fully objective (no LLM judge)
and inline; cells are resumable. QA: reference solutions score 100% on both
packages, pristine fixtures fail every step. **Warning: these are multi-turn
agentic runs — far heavier on usage than the one-shot suites.**

## The Gauntlet (Low or Bust 3)

Low-only stress test: a difficulty ladder (nine rungs and counting) that spends tokens ONLY at
the cracks. Each rung gets one run at low; a failure triggers two more low
trials (noise vs wall) plus one high trial (effort wall vs capability wall).

```bash
node gauntlet.mjs run          # climbs the ladder; cheap if low keeps winning
node gauntlet.mjs status
node gauntlet.mjs report       # writes report-gauntlet.html
```

Rungs: (1) symptom-only discovery debugging in ledgerlite (~450 lines, planted
UTC/local-time bug, red herrings included); (2) convention-violation bug hidden
in one of 20 near-identical hubapi modules (~1,100 lines); (3) a 12-step
dependent feature chain in one session, graded per-step to plot a context-bloat
degradation curve; (4) an underspecified rate-limiting feature graded on
behavior (rolling window, per-user isolation) via hidden acceptance tests;
(5) adversarial predict-the-output snippets (all answers established by
executing them); (6) "The Labyrinth" — three interacting bugs plus a decoy
report across 38 files; (7) "The Revision Chain" — 24 steps where later spec
revisions contradict earlier ones (plus a `rung7-guarded` variant validating
LOW-GUARD); (8) "The Liar" — the README, comments, and a test expectation are
confidently wrong and point away from the real bug; (9) "The Telephone Game" —
the spec arrives as a messy chat transcript with typos, self-corrections, and
a reference to a message never sent. QA: reference solutions score 100% on
every rung; pristine fixtures fail every rung.

## Low or Bust 4: Amnesia

Multi-session work where the context window dies between sittings and only
on-disk artifacts survive. Three work orders go to three FRESH sessions over
one persistent sandbox; work order #3 revises decisions from work order #1
without restating them ("raise the cap you were given in work order #1 by 2")
— the session applying the revision never saw the original. Conditions:
**notes** (sittings maintain a NOTES.md handoff), **nonotes** (handoff files
forbidden and deleted — only code survives), **monolith** (one session gets
all three work orders; context-survives control).

```bash
node amnesia.mjs run --trials 2      # 3 conditions × 2 trials = 14 agentic sessions
node amnesia.mjs status
```

Graded by hidden tests (25 checks pinning the final revised state of every
rule). QA: reference 100%, pristine fails.

## Notes

- **Runs are resumable** — Ctrl-C any time; already-completed runs are skipped.
- **Usage warning**: the full suite is 9 tasks × 5 efforts = 45 runs, and `xhigh`/`max` runs think a LOT. Start with `--efforts low,medium,high` if you're mid-week on usage limits.
- `report-demo.html` was generated from synthetic data so you can see what the output looks like before spending anything.
- Raw per-run records live in `results/raw/` as JSON — response text, token usage, duration, score, and grading detail.
- To re-grade from scratch, delete `results/raw` and re-run; to add tasks, edit `tasks.mjs`.

## Hermetic container mode

For gold-standard purity, gauntlet and amnesia runs can execute inside a
minimal OrbStack/Docker container (`Dockerfile`: node + the Claude CLI and
nothing else). The session sees ONLY its mounted sandbox — no host filesystem,
no global CLAUDE.md, no auto-memory, no benchmark breadcrumbs.

```bash
docker build -t lob-runner .
docker volume create lob-claude-auth
# one-time: seed auth from the host's macOS keychain into the volume
security find-generic-password -s "Claude Code-credentials" -w | \
  docker run --rm -i -v lob-claude-auth:/root/.claude node:22-slim \
  sh -c 'cat > /root/.claude/.credentials.json && chmod 600 /root/.claude/.credentials.json'

node gauntlet.mjs run --container      # any run, now hermetic
node amnesia.mjs run --container
```
