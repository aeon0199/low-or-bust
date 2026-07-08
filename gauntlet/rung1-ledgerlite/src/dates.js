// All ledger grouping is done in UTC so every user sees the same daily buckets
// regardless of their local timezone.

export function dateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDaysUTC(date, days) {
  const d = startOfDayUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isSameDayUTC(a, b) {
  return startOfDayUTC(a).getTime() === startOfDayUTC(b).getTime();
}
