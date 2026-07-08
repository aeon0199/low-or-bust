// applyPercent(subtotalCents, pct)
// pct is a WHOLE-NUMBER percent: 10 means "10% off". The discount is rounded
// to the nearest cent before subtracting.
export function applyPercent(subtotalCents, pct) {
  const discount = Math.round(subtotalCents * (pct / 100));
  return subtotalCents - discount;
}
