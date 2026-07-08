// Codex-authored practical builder suite for Low or Bust.
// Same one-shot harness as tasks.mjs, but the tasks are closer to everyday
// agentic building: messy records, redaction, service diagnosis, config drift,
// benchmark judgment, handoffs, and vision-preserving planning.

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export const tasks = [
  // ------------------------------------------------------------------ coding
  {
    id: "code-redact-agent-log",
    category: "coding",
    title: "Redact secrets from an agent log",
    prompt: `Implement a JavaScript function \`redactAgentLog(text)\` that removes secrets from a plain-text build or agent log while preserving useful surrounding context.

Rules:
- If \`text\` is not a string, return an empty string.
- Redact bearer tokens after \`Authorization: Bearer\`, case-insensitively, while preserving the label.
- Redact environment/config assignments whose key contains \`API_KEY\`, \`TOKEN\`, \`SECRET\`, \`PASSWORD\`, or \`ACCESS_KEY\`, preserving the key and separator (\`=\` or \`:\`).
- Redact URL credentials like \`https://user:pass@example.com/path\` to \`https://[REDACTED]@example.com/path\`.
- Redact obvious standalone provider tokens starting with \`sk-\`, \`sk_\`, \`ghp_\`, or \`xoxb-\`.
- Do not redact ordinary local paths, normal words like "token budget", or an existing literal \`[REDACTED]\`.

Define it as a top-level \`function redactAgentLog(text) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function - no examples, no explanation.`,
    exports: ["redactAgentLog"],
    testScript: `
check(() => redactAgentLog("Authorization: Bearer abc.def.ghi\\nstatus=ok"), "Authorization: Bearer [REDACTED]\\nstatus=ok");
check(() => redactAgentLog("OPENAI_API_KEY=sk-proj-abc123\\nPASSWORD: hunter2"), "OPENAI_API_KEY=[REDACTED]\\nPASSWORD: [REDACTED]");
check(() => redactAgentLog("curl https://jane:s3cr3t@example.com/repo.git"), "curl https://[REDACTED]@example.com/repo.git");
check(() => redactAgentLog("tokens in budget are fine; path=/Users/jmalone/Code/app"), "tokens in budget are fine; path=/Users/jmalone/Code/app");
check(() => redactAgentLog("github token ghp_abcdefghijklmnopqrstuvwxyz1234567890 used"), "github token [REDACTED] used");
check(() => redactAgentLog("already OPENAI_API_KEY=[REDACTED]"), "already OPENAI_API_KEY=[REDACTED]");
check(() => redactAgentLog(null), "");
`,
  },
  {
    id: "code-pick-effort-sweet-spots",
    category: "coding",
    title: "Pick effort sweet spots from messy results",
    prompt: `Implement a JavaScript function \`pickEffortSweetSpots(records, threshold = 0.95)\` for benchmark result records.

Each record may look like:
\`\`\`js
{ category: "coding", effort: "low", score: 100, isError: false, usage: { output_tokens: 213 } }
\`\`\`

Rules:
- Ignore records where \`isError\` is true or \`score\` is not a number.
- Group by \`category\`; if category is missing, use \`"uncategorized"\`.
- Within each category and effort, calculate mean score and mean output tokens. Missing \`usage.output_tokens\` counts as 0.
- For each category, find the best mean score.
- The sweet spot is the effort with mean score >= \`bestScore * threshold\` and the lowest mean output tokens.
- If token counts tie, use this effort order: low, medium, high, xhigh, max.
- Return an array sorted by category name. Each item must be:
  \`{ category, bestScore, sweetSpot, sweetScore, sweetTokens, runs }\`
- Round \`bestScore\` and \`sweetScore\` to 2 decimal places. Round \`sweetTokens\` to the nearest integer.
- \`runs\` is the number of non-error scored records considered for that category.

Define it as a top-level \`function pickEffortSweetSpots(records, threshold = 0.95) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function - no examples, no explanation.`,
    exports: ["pickEffortSweetSpots"],
    testScript: `
const records = [
  { category: "coding", effort: "low", score: 100, usage: { output_tokens: 100 } },
  { category: "coding", effort: "xhigh", score: 100, usage: { output_tokens: 900 } },
  { category: "coding", effort: "medium", score: null, usage: { output_tokens: 200 } },
  { category: "coding", effort: "high", score: 60, isError: true, usage: { output_tokens: 10 } },
  { category: "reasoning", effort: "low", score: 70, usage: { output_tokens: 90 } },
  { category: "reasoning", effort: "medium", score: 80, usage: { output_tokens: 200 } },
  { category: "reasoning", effort: "xhigh", score: 80, usage: { output_tokens: 800 } },
  { category: "writing", effort: "low", score: 78, usage: { output_tokens: 300 } },
  { category: "writing", effort: "medium", score: 82, usage: { output_tokens: 280 } },
  { category: "writing", effort: "high", score: 83, usage: { output_tokens: 800 } },
  { category: "writing", effort: "xhigh", score: 84, isError: true, usage: { output_tokens: 100 } },
];
check(() => pickEffortSweetSpots(records), [
  { category: "coding", bestScore: 100, sweetSpot: "low", sweetScore: 100, sweetTokens: 100, runs: 2 },
  { category: "reasoning", bestScore: 80, sweetSpot: "medium", sweetScore: 80, sweetTokens: 200, runs: 3 },
  { category: "writing", bestScore: 83, sweetSpot: "medium", sweetScore: 82, sweetTokens: 280, runs: 3 },
]);
check(() => pickEffortSweetSpots([
  { effort: "low", score: 90, usage: { output_tokens: 100 } },
  { effort: "high", score: 100, usage: { output_tokens: 500 } }
], 0.9), [
  { category: "uncategorized", bestScore: 100, sweetSpot: "low", sweetScore: 90, sweetTokens: 100, runs: 2 },
]);
`,
  },
  {
    id: "code-diagnose-service-snapshot",
    category: "coding",
    title: "Diagnose a local service snapshot",
    prompt: `Implement a JavaScript function \`diagnoseServiceSnapshot(snapshot)\` that turns a small local service snapshot into an operator-friendly diagnosis.

Input shape:
\`\`\`js
{
  serviceName: "dashboard",
  expectedPort: 8787,
  staleAfterMs: 60000, // optional, default 60000
  processes: [{ pid: 123, name: "dashboard-server", port: 8787 }],
  health: { ok: true, status: 200 },
  lastHeartbeatMsAgo: 1200,
  db: { tables: { events: 10 } }
}
\`\`\`

Rules, in priority order:
1. If no process is listening on \`expectedPort\`, return \`{ status: "down", primaryCause: "no-listener", actions: ["start-service"] }\`.
2. If a process is listening on \`expectedPort\` but its name does not include \`serviceName\` case-insensitively, return \`{ status: "down", primaryCause: "port-conflict", actions: ["stop-conflicting-process", "restart-service"] }\`.
3. If \`health.ok\` is not true, return \`{ status: "degraded", primaryCause: "health-endpoint-failing", actions: ["inspect-health-endpoint", "check-recent-logs"] }\`.
4. If \`lastHeartbeatMsAgo\` is greater than \`staleAfterMs\` (default 60000), return \`{ status: "degraded", primaryCause: "stale-heartbeat", actions: ["inspect-worker-loop", "restart-service"] }\`.
5. If \`db.tables.events\` is exactly 0, return \`{ status: "degraded", primaryCause: "empty-events", actions: ["verify-event-writes", "inspect-database-path"] }\`.
6. Otherwise return \`{ status: "ok", primaryCause: "ok", actions: [] }\`.

Handle missing optional objects without throwing. Define it as a top-level \`function diagnoseServiceSnapshot(snapshot) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function - no examples, no explanation.`,
    exports: ["diagnoseServiceSnapshot"],
    testScript: `
check(() => diagnoseServiceSnapshot({ serviceName: "dashboard", expectedPort: 8787, processes: [] }), { status: "down", primaryCause: "no-listener", actions: ["start-service"] });
check(() => diagnoseServiceSnapshot({ serviceName: "dashboard", expectedPort: 8787, processes: [{ name: "old-server", port: 8787 }] }), { status: "down", primaryCause: "port-conflict", actions: ["stop-conflicting-process", "restart-service"] });
check(() => diagnoseServiceSnapshot({ serviceName: "dashboard", expectedPort: 8787, processes: [{ name: "Dashboard Server", port: 8787 }], health: { ok: false, status: 500 } }), { status: "degraded", primaryCause: "health-endpoint-failing", actions: ["inspect-health-endpoint", "check-recent-logs"] });
check(() => diagnoseServiceSnapshot({ serviceName: "dashboard", expectedPort: 8787, processes: [{ name: "dashboard", port: 8787 }], health: { ok: true }, lastHeartbeatMsAgo: 61000 }), { status: "degraded", primaryCause: "stale-heartbeat", actions: ["inspect-worker-loop", "restart-service"] });
check(() => diagnoseServiceSnapshot({ serviceName: "dashboard", expectedPort: 8787, processes: [{ name: "dashboard", port: 8787 }], health: { ok: true }, lastHeartbeatMsAgo: 10, db: { tables: { events: 0 } } }), { status: "degraded", primaryCause: "empty-events", actions: ["verify-event-writes", "inspect-database-path"] });
check(() => diagnoseServiceSnapshot({ serviceName: "dashboard", expectedPort: 8787, processes: [{ name: "dashboard", port: 8787 }], health: { ok: true }, lastHeartbeatMsAgo: 10, db: { tables: { events: 3 } } }), { status: "ok", primaryCause: "ok", actions: [] });
`,
  },
  {
    id: "code-diff-agent-configs",
    category: "coding",
    title: "Diff two agent config objects",
    prompt: `Implement a JavaScript function \`diffAgentConfigs(before, after)\` that reports meaningful changes between two JSON-like config objects.

Rules:
- Recursively compare plain objects.
- Treat arrays as atomic values: if two arrays are not deeply equal, report the whole array path as changed.
- Ignore keys named \`updatedAt\`, \`lastSeenAt\`, \`nonce\`, or \`_meta\` at any nesting level.
- Return an array sorted by \`path\` alphabetically.
- Each change must be \`{ path, before, after }\`.
- Use dot paths like \`tools.browser.enabled\`.
- If a value is missing on one side, use the literal string \`"<missing>"\`.
- Use deep JSON equality for values.

Define it as a top-level \`function diffAgentConfigs(before, after) { ... }\`. Reply with ONLY a single JavaScript code block containing the complete function - no examples, no explanation.`,
    exports: ["diffAgentConfigs"],
    testScript: `
check(() => diffAgentConfigs(
  { model: "fable-5", updatedAt: "old", tools: { shell: true, browser: false }, list: [1, 2] },
  { model: "fable-5.1", updatedAt: "new", tools: { shell: true, browser: true }, list: [1, 2, 3], extra: 1 }
), [
  { path: "extra", before: "<missing>", after: 1 },
  { path: "list", before: [1, 2], after: [1, 2, 3] },
  { path: "model", before: "fable-5", after: "fable-5.1" },
  { path: "tools.browser", before: false, after: true },
]);
check(() => diffAgentConfigs(
  { runtime: { policy: { allowShell: false, _meta: { note: "ignore" } } }, nonce: "a" },
  { runtime: { policy: { allowShell: true, _meta: { note: "different but ignored" } } }, nonce: "b" }
), [
  { path: "runtime.policy.allowShell", before: false, after: true },
]);
check(() => diffAgentConfigs({ a: { b: 1 } }, { a: "<missing>" }), [
  { path: "a", before: { b: 1 }, after: "<missing>" },
]);
`,
  },

  // --------------------------------------------------------------- reasoning
  {
    id: "reason-effort-default",
    category: "reasoning",
    title: "Choose a practical default effort",
    prompt: `You are choosing the default effort level for a downloadable benchmark aimed at everyday builders. Users can manually escalate later, so the default should avoid obvious quality failures but not waste tokens.

Mean results:

Category    effort    score    output tokens
coding      low       100      220
coding      medium    100      245
coding      high      100      410
coding      xhigh     100      950
reasoning   low       85       120
reasoning   medium    100      320
reasoning   high      100      700
reasoning   xhigh     100      1500
writing     low       72       300
writing     medium    82       360
writing     high      83       900
writing     xhigh     84       1600

Which effort should be the default? Choose exactly one: low, medium, high, or xhigh.

Reason briefly, then end your reply with a final line in exactly this format:
ANSWER: <effort>`,
    answer: "medium",
    answerType: "word",
  },
  {
    id: "reason-root-cause-log",
    category: "reasoning",
    title: "Find the real root cause in a build log",
    prompt: `A user says the report command suddenly fails after a cleanup. Here is the relevant evidence:

- \`npm test\` passes.
- \`node bench.mjs report\` fails with: \`Cannot find module '/project/dist/report.mjs'\`.
- The package script is: \`"report": "node dist/report.mjs"\`.
- The cleanup PR moved generated JS output from \`dist/\` to \`build/\`.
- The latest build log says: \`wrote build/report.mjs\`.
- The README still says to run \`npm run report\`.

What is the primary root cause? Choose exactly one label:
- missing-dependency
- stale-script-path
- bad-node-version
- auth-login-required

Reason briefly, then end your reply with a final line in exactly this format:
ANSWER: <label>`,
    answer: "stale-script-path",
    answerType: "word",
  },
  {
    id: "reason-blank-report",
    category: "reasoning",
    title: "Pick the safest fix for a blank report",
    prompt: `A static HTML benchmark report opens to a blank page. Evidence:

- The raw JSON files include successful runs and errored runs.
- Errored records have \`score: 0\`, \`scoreDetail: "run errored"\`, and \`usage: null\`.
- The browser console says: \`TypeError: Cannot read properties of null (reading 'output_tokens')\`.
- The chart code assumes every scored record has \`usage.output_tokens\`.
- Re-running the model would be expensive and might hit usage limits.

What is the safest first fix? Choose exactly one label:
- rerun-all-results
- ignore-errors-in-aggregate
- raise-model-effort
- delete-errored-json

Reason briefly, then end your reply with a final line in exactly this format:
ANSWER: <label>`,
    answer: "ignore-errors-in-aggregate",
    answerType: "word",
  },

  // ---------------------------------------------------------------- writing
  {
    id: "write-github-readme-section",
    category: "writing",
    title: "Write a GitHub-ready benchmark README section",
    prompt: `Write a README section for a GitHub project called "Low or Bust: Codex Suite".

Context:
- It compares model effort levels on practical one-shot builder tasks.
- It is not a full autonomous agent benchmark.
- It uses local graders for code/reasoning and a blind LLM judge for writing.
- It is meant to help people decide when higher effort is worth the token/time cost.
- It should warn that results depend on model, prompts, and task mix.

Requirements:
- 180-240 words.
- Include a short "How to run" code block with \`node bench.mjs all --suite codex --efforts low,medium,high,xhigh\`.
- Friendly, practical tone.
- Do not oversell the benchmark as universal truth.`,
    wordLimit: { min: 180, max: 240 },
    rubric: [
      { criterion: "practical clarity", desc: "Does it explain what the suite does and how to run it in a way a GitHub reader can use immediately? 3 = vague, 6 = usable, 9 = very clear." },
      { criterion: "scope honesty", desc: "Does it clearly say this is one-shot practical task testing, not a universal agent benchmark? 3 = overclaims, 6 = mild caveats, 9 = precise and honest." },
      { criterion: "tone", desc: "Is it friendly and practical without hype or corporate filler? 3 = stiff or salesy, 6 = fine, 9 = excellent." },
      { criterion: "format compliance", desc: "Meets length, includes the required command block, and stays focused? 3 = misses major requirements, 6 = minor issue, 9 = exact." },
    ],
  },
  {
    id: "write-continuation-handoff",
    category: "writing",
    title: "Summarize messy work into a continuation handoff",
    prompt: `Turn these messy notes into a concise continuation handoff for the next model/session.

MESSY NOTES:
- User wanted the benchmark harder but not huge.
- Do not delete old tasks.
- We created tasks-codex.mjs with practical builder-style tasks.
- bench.mjs should be able to choose the codex suite.
- Keep results separate so old report.html is not overwritten.
- Need to run syntax checks and dry-run status before saying done.
- Concern: do not accidentally make this require browser automation or local Mac-only tools.
- Next likely user question: should max be run now? Answer: only after low through xhigh separate meaningfully.

Requirements:
- Exactly 5 bullets.
- Each bullet must start with a bold label.
- Capture current state, constraints, verification, risks, and next step.
- No invented facts.`,
    rubric: [
      { criterion: "fidelity", desc: "Does it stick to the notes without inventing progress or facts? 3 = invented, 6 = mostly faithful, 9 = fully faithful." },
      { criterion: "handoff usefulness", desc: "Could the next model quickly continue from it? 3 = not actionable, 6 = usable, 9 = excellent." },
      { criterion: "structure compliance", desc: "Exactly 5 bullets, bold labels, and covers the requested areas? 3 = wrong structure, 6 = minor deviation, 9 = exact." },
      { criterion: "concision", desc: "Is it tight and readable rather than bloated? 3 = rambling, 6 = fine, 9 = crisp." },
    ],
  },
  {
    id: "write-vision-to-load-bearing-plan",
    category: "writing",
    title: "Preserve a big idea while naming the first real step",
    prompt: `A non-engineer founder brain-dumps this idea:

"I want an AI workbench that can watch what models are doing, tell me if the work is real, remember failures, compare model effort levels, and help normal people build with frontier models without needing to become engineers. It should not just be a dashboard of logs. It should feel like mission control for agentic work: what is it doing, is it healthy, what did it prove, what should I do next?"

Write a response that preserves the ambition while identifying the first load-bearing build step.

Requirements:
- 220-300 words.
- Do not reduce it to a toy MVP.
- Include one first build step that is genuinely useful on its own.
- Include what evidence would prove the first step works.
- Plain language, warm but not gushy.`,
    wordLimit: { min: 220, max: 300 },
    rubric: [
      { criterion: "vision preservation", desc: "Does it keep the full ambition alive rather than shrinking it into a tiny app? 3 = downscopes hard, 6 = partial, 9 = preserves it well." },
      { criterion: "load-bearing first step", desc: "Is the first step concrete, useful on its own, and connected to the larger system? 3 = toy or vague, 6 = decent, 9 = strong." },
      { criterion: "evidence and verification", desc: "Does it say what proof would show the first step works? 3 = no proof, 6 = generic proof, 9 = specific useful evidence." },
      { criterion: "plain-language tone", desc: "Would a non-engineer founder understand and feel well-met? 3 = jargon-heavy, 6 = readable, 9 = excellent." },
    ],
  },
];
