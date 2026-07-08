// Task suite for the effort-level benchmark.
// Three categories:
//   coding    — scored objectively by running embedded tests against the returned code
//   reasoning — scored objectively by comparing the final "ANSWER:" line to a known answer
//   writing   — scored by a blind LLM judge against a rubric (judge never sees the effort level)

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export const tasks = [
  // ------------------------------------------------------------------ coding
  {
    id: "code-parse-duration",
    category: "coding",
    title: "Implement parseDuration",
    prompt: `Implement a JavaScript function \`parseDuration(str)\` that parses a duration string into total seconds.

Rules:
- The string is made of up to three components in this exact order: hours ("Nh"), minutes ("Nm"), seconds ("Ns"). Each component is optional, but at least one must be present.
- N is one or more digits (leading zeros allowed). Units are lowercase only.
- No spaces or other characters are allowed anywhere.
- Return the total number of seconds as a number.
- Return null for any invalid input (wrong order, unknown units, empty string, spaces, non-string garbage between components, etc.).

Examples: parseDuration("1h30m15s") === 5415, parseDuration("45s") === 45, parseDuration("2h") === 7200, parseDuration("") === null.

Define it as a top-level \`function parseDuration(str) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function — no usage examples, no explanation.`,
    exports: ["parseDuration"],
    testScript: `
check(() => parseDuration("1h30m15s"), 5415);
check(() => parseDuration("45s"), 45);
check(() => parseDuration("2h"), 7200);
check(() => parseDuration("90m"), 5400);
check(() => parseDuration("0s"), 0);
check(() => parseDuration("007m"), 420);
check(() => parseDuration("2h5s"), 7205);
check(() => parseDuration(""), null);
check(() => parseDuration("90x"), null);
check(() => parseDuration("h"), null);
check(() => parseDuration("1s1h"), null);
check(() => parseDuration("10"), null);
check(() => parseDuration("1h 30m"), null);
check(() => parseDuration("1m2m"), null);
`,
  },
  {
    id: "code-fix-merge-intervals",
    category: "coding",
    title: "Fix buggy mergeIntervals",
    prompt: `The following JavaScript function is supposed to merge overlapping or touching intervals (e.g. [[1,3],[2,6],[8,10]] -> [[1,6],[8,10]], and [[1,4],[4,5]] -> [[1,5]]). It must work for input in any order and must not assume the input is sorted. It has bugs.

\`\`\`js
function mergeIntervals(intervals) {
  const merged = [];
  for (const [start, end] of intervals) {
    if (merged.length && start < merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = end;
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}
\`\`\`

Fix all the bugs. Keep the same function name and signature. Reply with ONLY a single JavaScript code block containing the complete corrected function — no explanation.`,
    exports: ["mergeIntervals"],
    testScript: `
check(() => mergeIntervals([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]]);
check(() => mergeIntervals([[1,4],[4,5]]), [[1,5]]);
check(() => mergeIntervals([[5,6],[1,2]]), [[1,2],[5,6]]);
check(() => mergeIntervals([[1,10],[2,3]]), [[1,10]]);
check(() => mergeIntervals([[2,3],[1,10],[11,12],[12,14]]), [[1,10],[11,14]]);
check(() => mergeIntervals([]), []);
check(() => mergeIntervals([[2,7]]), [[2,7]]);
`,
  },
  {
    id: "code-lru-cache",
    category: "coding",
    title: "Implement LRUCache",
    prompt: `Implement a JavaScript class \`LRUCache\` (least-recently-used cache):

- \`new LRUCache(capacity)\` — capacity is a positive integer.
- \`get(key)\` — returns the value if the key exists, otherwise -1. A successful get counts as a "use" (refreshes recency).
- \`put(key, value)\` — inserts or updates the value. Counts as a use. If inserting a new key would exceed capacity, evict the least recently used key first.

Reply with ONLY a single JavaScript code block containing the complete class declared as a top-level \`class LRUCache { ... }\` — no usage examples, no explanation.`,
    exports: ["LRUCache"],
    testScript: `
const c = new LRUCache(2);
c.put(1, 1);
c.put(2, 2);
check(() => c.get(1), 1);        // refreshes key 1
c.put(3, 3);                      // evicts key 2
check(() => c.get(2), -1);
check(() => c.get(3), 3);
c.put(4, 4);                      // evicts key 1 (3 was just used)
check(() => c.get(1), -1);
check(() => c.get(4), 4);
const d = new LRUCache(2);
d.put(1, "a");
d.put(2, "b");
d.put(1, "a2");                   // update refreshes key 1
d.put(3, "c");                    // evicts key 2
check(() => d.get(2), -1);
check(() => d.get(1), "a2");
check(() => d.get(3), "c");
`,
  },

  // --------------------------------------------------------------- reasoning
  {
    id: "reason-snail-pole",
    category: "reasoning",
    title: "Snail on a pole",
    prompt: `A snail is at the bottom of a 17-meter pole. Each day it climbs up 4 meters, and each night it slips back down 1 meter. On which day (counting the first day as day 1) does the snail first reach the top of the pole?

Think it through carefully, then end your reply with a final line in exactly this format:
ANSWER: <number>`,
    answer: "6",
    answerType: "number",
  },
  {
    id: "reason-trailing-zeros",
    category: "reasoning",
    title: "Trailing zeros of 137!",
    prompt: `How many trailing zeros does 137! (137 factorial) have when written out in base 10?

Work it out step by step, then end your reply with a final line in exactly this format:
ANSWER: <number>`,
    answer: "33",
    answerType: "number",
  },
  {
    id: "reason-race-order",
    category: "reasoning",
    title: "Race order deduction",
    prompt: `Four friends — Ana, Ben, Cal, and Dee — finished a race in some order (no ties).

Clues:
1. Ana finished before Ben but after Cal.
2. Dee was not last.
3. Dee finished before Cal.

Who finished third? Reason it out, then end your reply with a final line in exactly this format:
ANSWER: <name>`,
    answer: "ana",
    answerType: "word",
  },

  // ----------------------------------------------------------------- writing
  {
    id: "write-https-explainer",
    category: "writing",
    title: "Explain HTTPS to a 12-year-old",
    prompt: `Explain how HTTPS keeps data safe when you use a website, written for a smart 12-year-old. Use at most 200 words. Make it genuinely engaging, not dumbed-down.`,
    wordLimit: { max: 200 },
    rubric: [
      { criterion: "technical accuracy", desc: "Is the explanation of encryption/certificates actually correct (no wrong claims)? 3 = notable errors, 6 = mostly right with fuzzy spots, 9 = accurate throughout." },
      { criterion: "clarity for a 12-year-old", desc: "Would a smart 12-year-old follow every sentence? 3 = jargon-heavy, 6 = mostly clear, 9 = effortless." },
      { criterion: "analogy quality", desc: "Does it use a concrete, apt analogy or example that illuminates rather than distorts? 3 = none or misleading, 6 = serviceable, 9 = memorable and apt." },
      { criterion: "engagement", desc: "Is it lively and interesting rather than a dry lecture? 3 = flat, 6 = pleasant, 9 = genuinely fun to read." },
    ],
  },
  {
    id: "write-container-summary",
    category: "writing",
    title: "Summarize a passage in 3 bullets",
    prompt: `Summarize the following passage in exactly 3 bullet points. Each bullet must be one sentence. Capture the most important facts faithfully — do not add anything that is not in the passage.

PASSAGE:
Before the 1950s, cargo was loaded onto ships piece by piece — sacks, barrels, and crates carried by hand or crane in a slow, expensive process called break-bulk shipping. Loading a medium-sized ship could take a week and cost around $5.86 per ton. In 1956, an American trucking entrepreneur named Malcom McLean changed this by sending a converted tanker, the Ideal X, from Newark to Houston carrying 58 uniform metal boxes that could be lifted straight from truck to ship. Loading costs fell to roughly 16 cents per ton. But the real breakthrough came with standardization: through the 1960s, competing container sizes and corner fittings threatened to fragment the industry, until international standards agreed by 1968 settled common dimensions and the twistlock corner castings that let any crane in any port handle any container. Shipping costs fell so far that the cost of transport largely stopped mattering to where goods were made, reshaping global trade and making far-flung supply chains economical.

Reply with ONLY the 3 bullet points.`,
    rubric: [
      { criterion: "fidelity", desc: "Is every stated fact actually in the passage, with numbers and names correct? 3 = invented or garbled facts, 6 = minor imprecision, 9 = fully faithful." },
      { criterion: "coverage", desc: "Do the 3 bullets capture the three most important ideas (break-bulk cost, McLean/Ideal X breakthrough, standardization enabling global trade)? 3 = misses key ideas, 6 = captures most, 9 = captures all three." },
      { criterion: "format compliance", desc: "Exactly 3 bullets, one sentence each, nothing else? 3 = wrong structure, 6 = minor deviation, 9 = exact." },
      { criterion: "concision", desc: "Are the bullets tight and readable rather than run-on sentences stuffed with clauses? 3 = bloated, 6 = decent, 9 = crisp." },
    ],
  },
  {
    id: "write-launch-email",
    category: "writing",
    title: "Product announcement email",
    prompt: `Write a product announcement email for "Notely", a note-taking app, announcing its new Offline Mode.

Key points that must be covered:
- Notes now sync automatically when you're back online — no manual saving.
- Works on both mobile and desktop.
- Available today for all users on the free plan too, not just paid.

Requirements: 120-160 words in the body, a subject line, a clear call to action to try it, and a friendly-but-not-cringey tone. Reply with only the email (subject + body).`,
    wordLimit: { min: 120, max: 160 },
    rubric: [
      { criterion: "completeness", desc: "Are all three key points clearly present? 3 = missing points, 6 = all present but buried, 9 = all present and prominent." },
      { criterion: "tone", desc: "Friendly and human without hype-words, exclamation spam, or corporate stiffness? 3 = cringey or robotic, 6 = fine, 9 = pitch-perfect." },
      { criterion: "structure", desc: "Strong subject line, scannable body, clear single call to action? 3 = wall of text or no CTA, 6 = adequate, 9 = excellent." },
      { criterion: "length compliance", desc: "Body within 120-160 words (the measured word count is provided)? 3 = far outside, 6 = slightly outside, 9 = within range." },
    ],
  },
];
