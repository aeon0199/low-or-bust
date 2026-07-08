# Low-effort guardrails

Drop this block into your `CLAUDE.md` / `AGENTS.md` (project or global). It exists to
compensate for the one failure mode the Low or Bust benchmark ever measured at low
effort: silently picking one reading of an ambiguous instruction. Benchmarked evidence
lives in this repo (see WRITEUP.md — two frontier models, same crack, same word).

---

## Working rules (always apply)

1. **Compile revisions before implementing.** If the instructions revise or contradict
   earlier instructions, first write out the FINAL version of every affected rule, then
   implement from that final spec — never from memory of the running transcript.

2. **Compose combined formatting rules on paper first.** When several formatting or
   ordering rules stack (prefixes, suffixes, markers, separators), write ONE concrete
   example output that satisfies all of them, check it against each rule individually,
   then implement to match the example. Default reading: words like "append", "prefix",
   and "add" apply to the complete final output — not to an intermediate part — unless
   stated otherwise.

3. **Name your reading.** If an instruction has two defensible interpretations, pick one
   and say so in a single line (e.g. `Reading "appended" as: after the done marker`).
   Never resolve ambiguity silently — a visible choice is checkable; a silent one is a
   latent bug.

4. **Execute, don't predict.** If an output can be verified by cheaply running code,
   run it rather than asserting it from memory.
