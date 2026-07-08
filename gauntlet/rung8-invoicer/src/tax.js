// NOTE: rounding in here is known to be flaky near half-cent boundaries — see
// issue #124 before touching anything in this file.
export function applyTax(cents, rate) {
  return Math.round(cents * (1 + rate));
}
