// Hidden grader, rung 1 (ledgerlite timezone bug). Usage: node grade-rung1.mjs <sandbox>
// Re-execs itself in Pacific/Auckland so local time ≠ UTC and the bug manifests.
import { execFileSync } from "node:child_process";
import { makeGrader } from "../../hidden/grade-lib.mjs";

if (process.env.TZ !== "Pacific/Auckland") {
  const out = execFileSync(process.execPath, [process.argv[1], process.argv[2]], {
    env: { ...process.env, TZ: "Pacific/Auckland" },
    encoding: "utf8",
  });
  process.stdout.write(out);
  process.exit(0);
}

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("bug: dateKey buckets in UTC", 3, async (check, mod) => {
  const { dateKey } = await mod("src/dates.js");
  check("evening UTC stays same UTC day", () => dateKey(new Date("2026-03-15T20:00:00Z")) === "2026-03-15");
  check("year boundary", () => dateKey(new Date("2026-12-31T23:30:00Z")) === "2026-12-31");
  check("morning UTC unaffected", () => dateKey(new Date("2026-03-15T03:00:00Z")) === "2026-03-15");
});

await g.step("bug: dailyTotals groups by UTC day", 3, async (check, mod) => {
  const { dailyTotals } = await mod("src/summary.js");
  const { makeTransaction, resetIds } = await mod("src/models.js");
  resetIds();
  const txs = [
    makeTransaction({ amountCents: 100, postedAt: "2026-03-15T20:00:00Z" }),
    makeTransaction({ amountCents: 250, postedAt: "2026-03-15T21:30:00Z" }),
    makeTransaction({ amountCents: 999, postedAt: "2026-03-16T04:00:00Z" }),
  ];
  const rows = dailyTotals(txs);
  check("two UTC days, not three", () => rows.length === 2);
  check("evening txs on the 15th", () => rows[0]?.day === "2026-03-15" && rows[0]?.count === 2);
  check("totals math intact", () => rows[0]?.totalCents === 350);
});

await g.step("regressions: everything else untouched", 4, async (check, mod) => {
  const { byDateRangeUTC } = await mod("src/filter.js");
  const { formatCents } = await mod("src/currency.js");
  const { toCSV } = await mod("src/csv.js");
  const { makeTransaction, resetIds } = await mod("src/models.js");
  resetIds();
  const tx = makeTransaction({ amountCents: -12345, postedAt: "2026-05-10T12:00:00Z", memo: "rent" });
  check("range filter inclusive upper bound", () => byDateRangeUTC([tx], "2026-05-01", "2026-05-10").length === 1);
  check("currency formatting", () => formatCents(-12345, "USD") === "-$123.45");
  check("CSV keeps ISO timestamps", () => toCSV([tx]).includes("2026-05-10T12:00:00.000Z"));
  check("validation still throws", () => { try { makeTransaction({ amountCents: 1.5, postedAt: "2026-01-01" }); return false; } catch { return true; } });
});

g.report();
