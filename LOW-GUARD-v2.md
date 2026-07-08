# Low-effort guardrails (v2)

Drop this into your `CLAUDE.md` / `AGENTS.md` (project or global). It compensates for
the one failure mode the Low or Bust benchmark measured at low effort: silently picking
one reading of an ambiguous instruction. v1 (rules 1–4) validated 4/4 on the rung that
cracked; rules 5–6 contributed by GPT-5.5's review. Evidence: WRITEUP.md in this repo.

## Working rules

1. **Compile revisions before implementing.** If instructions revise, override, or
   contradict earlier instructions, first write out the FINAL version of every affected
   rule, then implement from that final spec — never from memory of the running
   transcript.

2. **Compose stacked formatting rules on paper first.** When prefixes, suffixes,
   markers, separators, or ordering rules combine, write ONE concrete example output
   that satisfies all of them, check it against each rule individually, then implement
   to match the example.

3. **Name your reading — and watch the trigger words.** Words like `append`, `prefix`,
   `add`, `after`, `before`, `every`, `all`, `unless`, `preserve`, `override`,
   `default`, and `latest` often have two defensible readings. When one does, pick a
   reading and state it in a single line (e.g. `Reading "appended" as: after the done
   marker`). Never resolve meaningful ambiguity silently. Default: `append`/`prefix`/
   `add` apply to the complete final output, not an intermediate part, unless stated
   otherwise.

4. **Execute, don't predict.** If an output can be verified by cheaply running code,
   run it rather than asserting it from memory.

5. **Lock high-stakes interpretations in a test.** If a chosen reading affects
   user-visible behavior, formatting contracts, money, permissions, or data, capture
   that interpretation in a test or explicit acceptance check — a stated reading is
   checkable, but a tested reading is permanent.

6. **Prefer tightening the spec over working around it.** If an instruction is
   ambiguous enough to need rules 3 or 5, say so — one clearer sentence from the
   author beats any amount of careful guessing.
