// Shared helpers for the hidden graders. Run per-sandbox as a child process so
// module caches never leak between sandboxes.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export function makeGrader(sandbox) {
  const steps = [];
  const mod = (p) => import(pathToFileURL(join(sandbox, p)).href);

  async function step(name, count, fn) {
    const s = { step: name, pass: 0, total: count, detail: [] };
    const check = (label, fn2) => {
      try {
        if (fn2()) s.pass++;
        else s.detail.push(`${label}: wrong value`);
      } catch (e) {
        s.detail.push(`${label}: threw ${String(e.message).slice(0, 80)}`);
      }
    };
    try {
      await fn(check, mod);
    } catch (e) {
      s.detail.push(`step failed to load: ${String(e.message).slice(0, 100)}`);
    }
    steps.push(s);
  }

  function baselineStep() {
    const s = { step: "baseline tests still pass", pass: 0, total: 1, detail: [] };
    try {
      execFileSync("node", ["--test", "test/baseline.test.mjs"], { cwd: sandbox, timeout: 30_000, stdio: "pipe" });
      s.pass = 1;
    } catch (e) {
      s.detail.push("baseline test suite failed");
    }
    steps.push(s);
  }

  function report() {
    const pass = steps.reduce((a, s) => a + s.pass, 0);
    const total = steps.reduce((a, s) => a + s.total, 0);
    console.log(JSON.stringify({ steps, pass, total }));
  }

  return { step, baselineStep, report, mod };
}

// key-order-insensitive deep equality, same policy as the main bench grader
const canon = (v) =>
  Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
  : v;
export const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
