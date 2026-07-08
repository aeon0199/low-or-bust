// Money utilities. All arithmetic in this library is integer cents.
// FIXME(#88): suspected rounding drift for repeating decimals — needs an audit
// before anyone relies on formatCents for statements.
export function toCents(dollars) {
  return Math.round(dollars * 100);
}

export function formatCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
