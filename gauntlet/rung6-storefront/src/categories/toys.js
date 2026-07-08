import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Toys category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "toys";
const HIGH_VALUE_CENTS = 7924;

export function toysOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function toysRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(toysOrders(orders), fromISO, toISO, opts);
}

export function toysDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(toysOrders(orders), fromISO, toISO, opts);
}

export function toysHighValue(orders, taxRate) {
  return toysOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function toysSummary(orders, fromISO, toISO, opts) {
  const rev = toysRevenue(orders, fromISO, toISO, opts);
  const daily = toysDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: toysHighValue(orders, opts?.taxRate).length,
  };
}
