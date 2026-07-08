import { dateKey } from "./dates.js";

export function groupByDay(txs) {
  const groups = new Map();
  for (const tx of txs) {
    const key = dateKey(tx.postedAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tx);
  }
  return groups;
}

export function dailyTotals(txs) {
  return [...groupByDay(txs).entries()]
    .map(([day, list]) => ({
      day,
      totalCents: list.reduce((a, t) => a + t.amountCents, 0),
      count: list.length,
    }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));
}

export function busiestDay(txs) {
  const totals = dailyTotals(txs);
  if (!totals.length) return null;
  return totals.reduce((best, row) => (row.count > best.count ? row : best));
}
