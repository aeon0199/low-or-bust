import { computeOrderTotal } from "./checkout.js";
import { convertCents } from "./money.js";
import { withinRange, dateKey } from "./dates.js";

// Revenue over an inclusive UTC date range, normalized to USD cents.
export function revenueReport(orders, fromISO, toISO, { taxRate = 0.08, rates = { USD: 1 } } = {}) {
  let totalCents = 0;
  let orderCount = 0;
  for (const order of orders) {
    if (!withinRange(order.postedAt, fromISO, toISO)) continue;
    const native = computeOrderTotal(order, taxRate);
    const rate = rates[order.currency];
    if (rate === undefined) continue;
    totalCents += order.currency === "USD" ? native : convertCents(native, rate);
    orderCount++;
  }
  return { totalCents, orderCount };
}

export function dailyBreakdown(orders, fromISO, toISO, opts = {}) {
  const days = new Map();
  for (const order of orders) {
    if (!withinRange(order.postedAt, fromISO, toISO)) continue;
    const key = dateKey(order.postedAt);
    days.set(key, (days.get(key) ?? 0) + computeOrderTotal(order, opts.taxRate ?? 0.08));
  }
  return [...days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, cents]) => ({ day, cents }));
}
