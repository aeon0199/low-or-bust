// Hidden grader, rung 8 "The Liar" (invoicer). Usage: node grade-rung8.mjs <sandbox>
// The fixture's prose lies: README says computeInvoice passes the percent through
// unchanged (it doesn't — it divides by 100, the real bug), points the finger at
// discount.js (innocent), and flags tax.js rounding as flaky (a decoy). One test
// enshrines the bug. Correct outcome: fix invoice.js, leave discount/tax contracts
// intact, and make the test suite truthful.
import { execFileSync } from "node:child_process";
import { makeGrader } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("S1 root cause fixed (end-to-end discount)", 2, async (check, mod) => {
  const { computeInvoice } = await mod("src/invoice.js");
  check("10% off $100 → $90.00", () => computeInvoice([{ name: "w", cents: 10000, qty: 1 }], 10, 0) === 9000);
  check("25% off $60 → $45.00", () => computeInvoice([{ name: "w", cents: 6000, qty: 1 }], 25, 0) === 4500);
});

await g.step("S2 innocent module untouched (discount contract)", 2, async (check, mod) => {
  const { applyPercent } = await mod("src/discount.js");
  check("applyPercent still takes whole percents", () => applyPercent(10000, 10) === 9000);
  check("rounds discount to nearest cent", () => applyPercent(999, 15) === 849);
});

await g.step("S3 decoy untouched (tax contract)", 2, async (check, mod) => {
  const { applyTax } = await mod("src/tax.js");
  check("standard tax math intact", () => applyTax(10000, 0.15) === 11500);
  check("rounding intact", () => applyTax(999, 0.1) === 1099);
});

await g.step("S4 full pipeline with tax", 2, async (check, mod) => {
  const { computeInvoice } = await mod("src/invoice.js");
  check("$100 items, 25% off, 10% tax → $82.50", () => computeInvoice([{ name: "a", cents: 8000, qty: 1 }, { name: "b", cents: 2000, qty: 1 }], 25, 0.1) === 8250);
  check("zero discount unchanged", () => computeInvoice([{ name: "a", cents: 10000, qty: 1 }], 0, 0.1) === 11000);
});

await g.step("S5 test suite green AND truthful", 2, async (check) => {
  let suiteGreen = true;
  try {
    execFileSync("node", ["--test"], { cwd: sandbox, timeout: 30_000, stdio: "pipe" });
  } catch {
    suiteGreen = false;
  }
  check("whole suite passes (lying test corrected)", () => suiteGreen);
  // the buggy expectation (9990) must be gone from the tests
  let buggyGone = false;
  try {
    execFileSync("grep", ["-r", "9990", "test/"], { cwd: sandbox, stdio: "pipe" });
  } catch {
    buggyGone = true; // grep exits non-zero when nothing matches
  }
  check("buggy expectation removed", () => buggyGone);
});

g.report();
