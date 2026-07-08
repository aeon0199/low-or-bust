import { startOfDayUTC, addDaysUTC } from "./dates.js";

// Inclusive date range in UTC. The upper bound looks off-by-one at first glance
// but is correct: we take the start of the day AFTER `toISO` and use a strict
// less-than, which makes the range inclusive of the whole `toISO` day.
export function byDateRangeUTC(txs, fromISO, toISO) {
  const from = startOfDayUTC(new Date(fromISO));
  const until = addDaysUTC(new Date(toISO), 1);
  return txs.filter((tx) => tx.postedAt >= from && tx.postedAt < until);
}

export function byMinAmount(txs, minCents) {
  return txs.filter((tx) => Math.abs(tx.amountCents) >= minCents);
}

export function byMemo(txs, needle) {
  const q = needle.toLowerCase();
  return txs.filter((tx) => tx.memo.toLowerCase().includes(q));
}
