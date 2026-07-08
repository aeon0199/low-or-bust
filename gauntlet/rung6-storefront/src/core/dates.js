export function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDaysUTC(date, days) {
  const d = startOfDayUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Inclusive UTC date range: a timestamp anywhere on the `fromISO` day through
// anywhere on the `toISO` day is inside the range.
export function withinRange(date, fromISO, toISO) {
  const from = startOfDayUTC(new Date(fromISO));
  const until = startOfDayUTC(new Date(toISO));
  return date >= from && date < until;
}

export function dateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
