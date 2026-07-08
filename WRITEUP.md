# Low or Bust

**I benchmarked Claude's effort levels seven different ways trying to make "low" crack. It cost me one checkmark.**

*July 2026 · ~180 real runs · Opus 4.8 and Fable 5 · all code and raw results in this repo*

---

## The question

Claude Code has an effort dial: `low → medium → high → xhigh → max`. It controls how much the model is allowed to "think" before answering, and the token difference between the ends is enormous. Everyone who uses these models has the same quiet anxiety: *what am I supposed to set this to?* The folklore says more effort = better answers. The bill says more effort = more tokens. Nobody I could find had published data on where the trade actually lands for everyday work.

So we built the instrument instead of guessing.

## The instrument

A zero-dependency harness (`bench.mjs`) that runs the same task suite at every effort level through headless `claude -p` sessions and records exactly what each run cost: output tokens (thinking included), wall-clock, and the response. Grading is deliberately paranoid:

- **Coding** tasks are graded by *executing the returned code* against hidden tests.
- **Reasoning** tasks have brute-force-verified answers checked by exact match.
- **Writing** tasks go to a **blind LLM judge** that never sees which effort level produced the response.

Every task was proven solvable before any tokens burned: reference solutions had to score 100% through the real grading path, and pristine fixtures had to fail. This discipline caught real authoring bugs before they could poison results — including a logic puzzle that turned out to have *zero* valid solutions and a hand-computed test expectation that a brute-forcer proved wrong.

## Round 1: everything is 100

Nine tasks (coding, reasoning, writing) × four effort levels, run on **Opus 4.8** and then **Fable 5**.

Coding and reasoning: **100/100 at every effort level, both models.** Every implementation passed every test at low. The only thing effort changed was the price — on reasoning tasks, xhigh burned ~50–60% more tokens to produce the same correct answers. Opus overthought a snail-on-a-pole puzzle to 1,107 tokens at xhigh; the same model answered it correctly in 362 at low.

Writing was flatter than flat. Fable's blind-judged means from low to xhigh: **80, 81, 82, 81.** One task, a product launch email, scored 88 at low in 318 tokens — and 88 at xhigh in 1,574 tokens. Same grade, five times the bill. Opus actually got *worse* with more thinking on one task (70 at low → 63 at xhigh).

Verdict: suite too easy. Escalate.

(Round 1 was the only round run on both models. With Opus 4.8 and Fable 5 telling the identical story — and Fable being the model whose dial we actually wanted mapped — every experiment from here on ran on **Fable 5 only**.)

## Round 2: traps

A "hard suite" where every task has a deliberate trap for shallow processing: a weighted-interval problem where greedy fails, an RFC-4180 CSV parser where `split(",")` dies on quoted commas, a lexicographically-smallest topological sort where any plain DFS gives the wrong valid answer, counterintuitive probability (the answer is 0.8; instinct says ½ or ⅔), and writing briefs with stacked simultaneous constraints.

Result: **low swept everything.** 100s across coding and reasoning at every effort. And the writing data produced the project's spiciest finding: on a constrained postmortem rewrite, **low scored 88 and xhigh scored 73** — the judge found the xhigh output had *added unrequested padding that broke the constraints*. Extra thinking wasn't neutral; it actively hurt. (This matches the 2026 "overthinking" literature — e.g. *When More Thinking Hurts*, arXiv 2604.10739.)

## Round 3: delegation

New hypothesis, new experiment (`delegation.mjs`): for multi-step coding work, is one long-context agent better than an orchestrator handing each step to a **fresh worker at low effort**? Real agentic runs — agents got file-editing tools in sandboxed codebases, graded by hidden tests, no LLM judge anywhere.

Result across 27 clean cells: **every cell scored 100/100** — monolith and workers, independent and entangled steps alike. So quality tied, and economics decided it: fresh workers cost ~1.5–2× the tokens and ~3× the wall-clock of one session doing all five steps, because each worker pays a re-orientation tax reading the project from scratch. At small scale, delegation buys nothing. (The literature suggests the crossover lives at much larger context sizes — our fixture never got big enough to rot.)

## Round 4: the gauntlet

If a grid can't find the edge, build a ladder. Five rungs, each pushing a different axis where low *should* be weakest, with an adaptive protocol: one low run per rung; only a failure triggers more spending (two more low trials + one high trial to classify the crack).

1. **Discovery debugging** — ~450-line codebase, symptom-only bug report ("New Zealand users see evening transactions under the wrong day"), planted UTC/local-time bug, red herrings. **Passed, 1.4k tokens, 49s** — found the root cause, ignored both herrings.
2. **Needle in 25 files** — one module out of 20 near-identical ones violates the core validation contract. **Passed, 1.1k tokens, 42s.**
3. **12-step dependent chain** — one session, per-step grading to plot a context-bloat degradation curve. **Passed 31/31 — the curve is a flat wall.** Step 12 as clean as step 1.
4. **Underspecified feature** — "add per-user rate limiting, design is yours," graded on behavior. **Passed 10/10 — including a check built specifically to catch lazy fixed-bucket implementations. Low built a true rolling window.**
5. **Adversarial code reading** — seven predict-the-output traps (`[1,2,3].map(parseInt)`, microtask ordering, splice-during-iteration). Every answer pre-verified by execution. **Passed 7/7 in 603 tokens.**

Total cost of the whole stress test: **~11k tokens.** Cheapest run of the project.

## Round 5: the escalation — and the crack

Two custom monsters, built after asking *why* everything survived: every prior task had one cause and a clean signal. Real difficulty is multiple causes, overlapping symptoms, and reports that are partly wrong.

**Rung 6, "The Labyrinth":** 38 files, THREE interacting bugs all feeding one revenue report (a floor-vs-round conversion, an off-by-a-day range filter, a coupon applied post-tax against a documented pre-tax spec), plus a fourth user report describing *intended, documented behavior* (the grader punishes "fixing" it), plus a loose-equality lookup that looks like a rookie mistake but is load-bearing. Low **walked it: 18/18, first try, 4.4k tokens.** Fixed all three real bugs at the root, left the decoy alone, didn't touch the trap. The single best debugging performance of the project.

**Rung 7, "The Revision Chain":** 24 steps in one session where the spec contradicts itself five times — the notes cap changes twice (10 → 5 → 7), the priority-tag rule changes three times, a function gets renamed mid-stream with a compatibility-alias requirement. Grading tests only the *final* contracts.

And there it was. **Low, trial 1: 96/100.** After ~180 perfect scores, the first dropped points.

The autopsy is the best part. Of 45 hidden checks, low missed two — both the same slip: it rendered `#2 x [1] ✓` instead of `#2 x ✓ [1]`. The note-count suffix went before the done-checkmark instead of at the end. All five spec revisions were tracked correctly. The cap ended at 7. The rename and alias both worked. The crack was a *formatting-order composition detail* — precisely the signature of stale-context pressure, and (honest asterisk) close enough to a spec ambiguity that reasonable people could argue.

The probes then completed the picture: **low went 96, 100, 100 across three trials; high went 100.** Not a wall — a wobble. Under heavy revision pressure, low is roughly a 1-in-3 chance of one small slip instead of a guarantee, and either a retry or a higher effort setting buys the reliability back.

## The replication: a rival model runs the gauntlet

Then the twist. The same seven-rung gauntlet was wired up to run **GPT-5.5** (via `codex exec`, reasoning effort low) — a different frontier model from a different lab, same fixtures, same hidden graders, same protocol.

GPT-5.5 at low **swept rungs 1 through 6**, including the Labyrinth (18/18 — near-identical cost to Fable: 4,350 tokens vs 4,414). And on rung 7 it cracked — **on the same two checks, producing the byte-identical output**: `#2 x [1] ✓` where the grader wanted `#2 x ✓ [1]`. Two independent models, same "mistake," character for character.

But the profiles differed in a way that turned out to be the most instructive data in the project:

```
Fable 5  low:  96, 100, 100   (wobbles between the two readings)
GPT-5.5  low:  96,  96,  96   (locks onto one reading, every time)
Both     high: 100            (independently converge on the same reading)
```

Three conclusions, the first at our own expense:

**The benchmark caught its own bug.** One model misordering a suffix is a slip; two models producing identical output means the brief was ambiguous. Step 12 said the note suffix is "appended" — appended to the *title*, or to the *fully rendered string after the ✓*? Both readings are defensible. The instrument's most famous crack was substantially a spec bug in its own English, and we're keeping it that way in the record, because rung 7 accidentally became the most realistic test of all: most real-world prompts are not perfect specs.

**High effort buys careful reading, not raw capability.** If the two readings were a pure coin flip, more thinking shouldn't systematically pick one — yet both models, independently, switch to the grader's reading at high effort. Extra deliberation didn't make them smarter; it made them *reread the compositional ordering more carefully* (GPT-5.5's own phrasing, which we can't beat). Six rungs of deliberate traps couldn't isolate what the effort dial buys; one accidentally ambiguous word did.

**Variance shape decides whether retries work** *(credit: GPT-5.5's analysis of its own failure)*. Fable's low-effort wobble means a retry has a real chance of landing the other reading — retries are a legitimate cheap fix. GPT-5.5's stable bias means retries at low reproduce the same output forever — only a clearer prompt or a higher effort setting breaks it out. So the diagnostic is beautifully simple: **rerun once. A different answer means variance (retry away); the same answer means conviction (stop paying for retries — fix the spec or raise the dial).** Caveat: three trials per model is tiny; treat the "flexible vs stubborn" characterization as a hypothesis, not a personality.

## The fix — and its measured validation

If the residual risk at low is silent ambiguity resolution, the fix shouldn't be "raise the dial" or "harden every prompt" — it should be **standing knowledge**: a short guardrail block in the agent's `CLAUDE.md`/`AGENTS.md` that changes how it works *every* task. We wrote one ([LOW-GUARD.md](LOW-GUARD.md)), four rules, each aimed at a measured failure: compile revisions into a final spec before implementing; write one concrete example when formatting rules stack (with the explicit default that "append" means the complete final output); name your reading when two interpretations exist; execute rather than predict.

Then we measured it, because that's the house style: the identical Revision Chain brief, identical grader, dial still on low — only difference, the guard present as the sandbox's `CLAUDE.md`.

```
un-guarded low:  96, 100, 100      (the crack)
guarded low:    100, 100, 100, 100 (closed)
```

Honest cost note: guarded low runs spent ~9–10k tokens on this rung versus ~5–8k un-guarded — the spec-compilation work isn't free, and on this rung it cost about what a high run does. But the guard's rules are conditional (they only fire on revision-heavy or ambiguity-prone instructions; a normal task pays nearly nothing), and unlike raising the dial, the extra work is *targeted at the actual failure mode* rather than generic deliberation. Four trials is a small sample against a 1-in-3 wobble — but 4/4 with the mechanism directly addressed is enough to ship a config block that costs one paste.

## What we think it means

**Low isn't "no thinking" — it's adaptive.** At low effort, Fable spent 142 tokens on an easy puzzle and 5,700 on a 12-step build. The model already scales deliberation to perceived difficulty *within* low; the dial mostly caps how far it may spiral. For tasks inside the model's competence — which, on this evidence, includes symptom-only debugging, thousand-line codebases, multi-constraint algorithms, and open-ended design — the cap never binds.

**The band where effort matters is real but narrow, and it moves.** Two model generations ago these tasks likely needed the thinking budget. Capabilities migrate into the model's reflexes; the folklore ("more = better") fossilizes. Meanwhile provider guidance stays conservative for rational reasons: their benchmarks weight the brutal tail where effort *does* move numbers, and nobody files bug reports about answers that were right but overpaid-for.

**The practical rule, final form:**
- Default to **low** for anything you'd ask in one sitting. On ~180 runs across two models we found zero cases where higher effort bought correctness.
- On long, self-contradicting, revision-heavy specs where a small slip matters: **rerun once.** A different answer means variance — retries at low are a cheap fix. The same answer means conviction — retrying buys nothing; clarify the prompt or raise the effort. (And the dominant move is always the free one: write the ambiguous sentence more clearly.)
- Treat anything above medium as insurance you buy deliberately, for named reasons — frontier-difficulty problems, one-shot high-stakes answers, hour-long autonomy — not as a default.

## Caveats, honestly

Mostly single trials per cell (writing-judge differences under ~10 points are noise). One model family, mid-2026. Codebases up to ~1,100 lines — real 100k-line repos and hour-long agentic sessions are beyond this instrument, and that's exactly where we'd expect the story to *start* changing. The one crack sits near a spec ambiguity. And a suite contributed by a rival model (GPT-5.5 Codex — clean work, one grading-fairness fix applied) sits in the repo still unrun. The gauntlet is a ladder, not a proof: it shows where low *didn't* crack, and the next generation of rungs might land differently.

## Reproduce it

```bash
npm install -g @anthropic-ai/claude-code && claude   # login once
node bench.mjs all                                    # the original grid
node bench.mjs all --suite hard                       # the trap suite
node delegation.mjs run                               # monolith vs fresh workers
node gauntlet.mjs run                                 # the ladder (cheap: spends only at cracks)
```

Every report is a self-contained HTML file; every raw run is a JSON record with the full response, token counts, and grading detail.

---

*Built by Claude Fable 5 — the later experiments authored, fittingly, at low effort (the verification loops, not the thinking budget, caught every authoring mistake). Replication run and failure analysis contributed by GPT-5.5, which cracked on the same word, diagnosed both models' failure profiles, and politely corrected this writeup's overstatements. Directed, funded, and repeatedly escalated by a human who kept asking "okay but can we make it harder?" The folder name was the hypothesis. It retired undefeated on points.* 🐌👑
