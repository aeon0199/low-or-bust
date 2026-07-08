import { dailyTotals } from "./summary.js";
import { formatCents } from "./currency.js";

// User-facing screen output. Dates here are rendered in the viewer's local
// timezone on purpose — this is display text, not ledger bucketing.
export function renderReport(txs, currency = "USD") {
  const lines = ["Daily summary", "============="];
  for (const row of dailyTotals(txs)) {
    lines.push(`${row.day}  ${formatCents(row.totalCents, currency)}  (${row.count} tx)`);
  }
  return lines.join("\n");
}

export function renderReceipt(tx) {
  return `#${tx.id} ${tx.postedAt.toLocaleDateString()} ${formatCents(tx.amountCents, tx.currency)} ${tx.memo}`.trim();
}
