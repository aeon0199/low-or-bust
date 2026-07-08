// Hard suite — designed so that the instinctive first answer is WRONG.
// Every task has a deliberate trap that shallow processing falls into:
//   coding    — greedy/naive approaches pass the obvious cases but fail hidden structure
//   reasoning — the intuitive answer differs from the computed one (all answers
//               brute-force verified before inclusion)
//   writing   — many simultaneous hard constraints that careless drafting violates
// If effort level buys anything, this is the suite where it shows.

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export const tasks = [
  // ------------------------------------------------------------------ coding
  {
    id: "hard-weighted-intervals",
    category: "coding",
    title: "Max-value non-overlapping intervals",
    // Trap: greedy by value (or by end time ignoring weights) fails; needs DP.
    prompt: `Implement a JavaScript function \`weightedIntervalMax(intervals)\`.

Each interval is \`[start, end, value]\` with start < end and value > 0. Choose a subset of intervals such that no two chosen intervals overlap, maximizing the total value. Touching is allowed: an interval may start exactly where another ends.

Return the maximum total value as a number. Empty input returns 0.

Correctness matters more than speed; input arrays are small (< 100 intervals) but adversarial.

Define it as a top-level \`function weightedIntervalMax(intervals) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function — no examples, no explanation.`,
    exports: ["weightedIntervalMax"],
    testScript: `
check(() => weightedIntervalMax([]), 0);
check(() => weightedIntervalMax([[2,5,7]]), 7);
check(() => weightedIntervalMax([[1,4,5],[3,6,6],[5,8,5]]), 10);            // greedy-by-value picks 6, optimal is 5+5
check(() => weightedIntervalMax([[1,3,4],[3,5,4],[5,7,4]]), 12);            // touching chain all compatible
check(() => weightedIntervalMax([[1,10,10],[1,2,3],[2,3,3],[3,4,3],[4,5,3]]), 12);  // long fat interval loses to chain
check(() => weightedIntervalMax([[1,5,7],[2,3,9]]), 9);                     // nested: inner one wins
check(() => weightedIntervalMax([[1,2,1],[2,3,10],[1,3,5]]), 11);
check(() => weightedIntervalMax([[6,8,2],[1,4,3],[4,6,3],[3,7,7]]), 8);     // 3+3+2 beats 7 or 3+7-overlap
`,
  },
  {
    id: "hard-parse-csv-line",
    category: "coding",
    title: "Parse one RFC-4180 CSV line",
    // Trap: split(",") passes the easy cases, quoted commas and "" escapes kill it.
    prompt: `Implement a JavaScript function \`parseCSVLine(line)\` that parses a single CSV line (RFC 4180 style) into an array of field strings.

Rules:
- Fields are separated by commas.
- A field may be wrapped in double quotes. Inside a quoted field, commas are literal, and an escaped quote is written as two double quotes (\`""\`) and becomes one literal \`"\`.
- An unquoted field may not contain any double-quote character.
- After a quoted field closes, only a comma or end-of-line may follow.
- The empty string parses to \`[""]\` (one empty field). A line like \`a,,c\` has an empty middle field. A trailing comma means a trailing empty field.
- Return null for malformed input: unterminated quote, a quote inside an unquoted field, junk after a closing quote, or a non-string argument.

Define it as a top-level \`function parseCSVLine(line) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function — no examples, no explanation.`,
    exports: ["parseCSVLine"],
    testScript: `
check(() => parseCSVLine("a,b,c"), ["a","b","c"]);
check(() => parseCSVLine('a,"b,c",d'), ["a","b,c","d"]);
check(() => parseCSVLine('"he said ""hi""",x'), ['he said "hi"',"x"]);
check(() => parseCSVLine("a,,c"), ["a","","c"]);
check(() => parseCSVLine('""'), [""]);
check(() => parseCSVLine(""), [""]);
check(() => parseCSVLine(",a,"), ["","a",""]);
check(() => parseCSVLine('"",""'), ["",""]);
check(() => parseCSVLine('a,"unterminated'), null);
check(() => parseCSVLine('a,b"c'), null);
check(() => parseCSVLine('"a"b,c'), null);
check(() => parseCSVLine('"a""b""c"'), ['a"b"c']);
check(() => parseCSVLine(42), null);
`,
  },
  {
    id: "hard-lex-topo-order",
    category: "coding",
    title: "Lexicographically smallest task order",
    // Trap: any valid topological sort (plain DFS) fails — must be the SMALLEST one.
    prompt: `Implement a JavaScript function \`buildOrder(n, edges)\`.

There are n tasks numbered 0 to n-1. Each edge \`[a, b]\` means task a must run before task b. Return an array giving a valid ordering of ALL n tasks. If several valid orderings exist, return the lexicographically smallest one (compare as number sequences: [0,3,...] beats [1,0,...]). If the dependencies contain a cycle, return null.

Duplicate edges may appear. Edges are within range.

Define it as a top-level \`function buildOrder(n, edges) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function — no examples, no explanation.`,
    exports: ["buildOrder"],
    testScript: `
check(() => buildOrder(3, []), [0,1,2]);
check(() => buildOrder(4, [[3,0],[3,1],[0,2]]), [3,0,1,2]);          // must delay 0,1,2 behind 3, then go smallest-first
check(() => buildOrder(5, [[4,0],[1,0]]), [1,2,3,4,0]);
check(() => buildOrder(2, [[0,1],[1,0]]), null);                      // cycle
check(() => buildOrder(1, [[0,0]]), null);                            // self-cycle
check(() => buildOrder(4, [[1,0],[2,0],[3,0]]), [1,2,3,0]);
check(() => buildOrder(6, [[5,2],[5,0],[4,0],[4,1],[2,3],[3,1]]), [4,5,0,2,3,1]);   // brute-force verified
check(() => buildOrder(3, [[0,1],[0,1]]), [0,1,2]);                   // duplicate edges
`,
  },

  // --------------------------------------------------------------- reasoning
  {
    id: "hard-coin-faces",
    category: "reasoning",
    title: "Conditional probability with loaded coins",
    // Trap: intuition says 1/2 or 2/3; face-counting gives 0.8. Verified by enumeration.
    prompt: `A bag contains 4 coins: two are double-headed, one is fair (heads on one side, tails on the other), and one is double-tailed. You pull one coin at random and place it flat on the table without looking at the bottom side. The side facing up is heads.

What is the probability that the side facing DOWN is also heads? Give the answer as a decimal (for example: 0.25).

Work it out carefully, then end your reply with a final line in exactly this format:
ANSWER: <decimal>`,
    answer: "0.8",
    answerType: "number",
  },
  {
    id: "hard-count-multiples",
    category: "reasoning",
    title: "Divisible by 3 or 5 but not 15",
    // Trap: careless inclusion-exclusion gives 467 or 335. Verified by brute force: 401.
    prompt: `How many integers from 1 to 1000 (inclusive) are divisible by 3 or by 5, but NOT divisible by 15?

Work it out step by step, then end your reply with a final line in exactly this format:
ANSWER: <number>`,
    answer: "401",
    answerType: "number",
  },
  {
    id: "hard-puzzle-hunt",
    category: "reasoning",
    title: "Five-person finish order",
    // Requires genuine backtracking across 6 interacting constraints.
    // Brute-force verified: unique solution Tao,Sam,Quinn,Priya,Rosa → fourth is Priya.
    prompt: `Five friends — Priya, Quinn, Rosa, Sam, and Tao — finished a puzzle hunt in positions 1 (first) through 5 (last), no ties.

Clues:
1. Priya finished immediately after Quinn.
2. Rosa did not finish in the top two.
3. Sam finished somewhere before Quinn.
4. Tao finished either first or last.
5. Exactly two people finished between Rosa and Sam.
6. Quinn did not finish second.

Who finished fourth? Reason it out carefully — check every clue against your answer before committing. End your reply with a final line in exactly this format:
ANSWER: <name>`,
    answer: "priya",
    answerType: "word",
  },

  // ----------------------------------------------------------------- writing
  {
    id: "hard-postmortem-rewrite",
    category: "writing",
    title: "Constrained postmortem rewrite",
    // Trap: five facts + four simultaneous formal constraints; careless drafts always violate one.
    prompt: `Rewrite the following sloppy incident note as a crisp postmortem summary.

SLOPPY NOTE:
"So basically on Tuesday around 14:05 UTC everything kind of went sideways with checkout, turns out there was this whole issue where the TLS certificate on the payment gateway had expired which nobody noticed, and for about 41 minutes roughly 12% of checkout attempts were just failing outright. We got it sorted and going forward the plan is we're setting up automated certificate renewal plus alerts that fire 30 days before any cert expires so this can't sneak up on us again."

HARD CONSTRAINTS — all must hold simultaneously:
- Exactly 4 sentences.
- At most 80 words total.
- Entirely in past tense (the prevention step should be described as a decision that was made).
- Do not use the words "issue", "problem", or any form of "fix" (fixed, fixing, etc.).
- Preserve all five facts: the time (Tuesday 14:05 UTC), the duration (41 minutes), the cause (expired TLS certificate on the payment gateway), the impact (about 12% of checkout attempts failed), and the prevention (automated certificate renewal plus alerts 30 days before expiry).

Reply with ONLY the rewritten summary.`,
    rubric: [
      { criterion: "constraint compliance", desc: "Exactly 4 sentences, ≤80 words, past tense throughout, and none of the forbidden words (issue/problem/fix in any form)? Count carefully. 3 = multiple violations, 6 = one violation, 9 = fully compliant." },
      { criterion: "fact preservation", desc: "All five facts present and numerically correct (Tuesday 14:05 UTC, 41 min, expired TLS cert on payment gateway, ~12% checkouts failed, renewal + 30-day alerts)? 3 = facts missing or wrong, 6 = one slip, 9 = all five exact." },
      { criterion: "professional clarity", desc: "Does it read like a crisp postmortem rather than a compressed word-salad? 3 = awkward, 6 = serviceable, 9 = polished." },
      { criterion: "concision", desc: "Is every word earning its place within the budget? 3 = padded, 6 = decent, 9 = tight." },
    ],
  },
  {
    id: "hard-locking-tradeoff",
    category: "writing",
    title: "Optimistic vs pessimistic locking, exactly 3 paragraphs",
    // Trap: precise structural spec + technical accuracy + a concrete failure scenario.
    prompt: `Explain the tradeoff between optimistic and pessimistic locking to a junior developer who has just hit their first lost-update bug.

HARD CONSTRAINTS:
- Exactly 3 paragraphs, separated by blank lines. No headings, no bullet points.
- Paragraph 1: what each strategy actually does, mechanically.
- Paragraph 2: one CONCRETE failure scenario for each strategy (a specific sequence of events, not a vague "conflicts can occur").
- Paragraph 3: a practical rule of thumb for choosing, tied to contention level.
- 130-180 words total.

Reply with ONLY the explanation.`,
    wordLimit: { min: 130, max: 180 },
    rubric: [
      { criterion: "technical accuracy", desc: "Are the mechanics of both strategies correct (version check/retry vs lock acquisition/blocking)? 3 = wrong mechanics, 6 = fuzzy, 9 = precise." },
      { criterion: "scenario concreteness", desc: "Does paragraph 2 give a specific event sequence for BOTH strategies (e.g. two writers, who reads when, what fails)? 3 = vague, 6 = one concrete, 9 = both concrete." },
      { criterion: "structure compliance", desc: "Exactly 3 paragraphs with the assigned content in the assigned order, no headings/bullets, within 130-180 words? 3 = wrong structure, 6 = minor deviation, 9 = exact." },
      { criterion: "junior-friendly clarity", desc: "Would a junior dev who just hit a lost update actually get it? 3 = jargon wall, 6 = readable, 9 = illuminating." },
    ],
  },
];
