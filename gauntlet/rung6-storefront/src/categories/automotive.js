import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Automotive category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "automotive";
const HIGH_VALUE_CENTS = 12310;

export function automotiveOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function automotiveRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(automotiveOrders(orders), fromISO, toISO, opts);
}

export function automotiveDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(automotiveOrders(orders), fromISO, toISO, opts);
}

export function automotiveHighValue(orders, taxRate) {
  return automotiveOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function automotiveSummary(orders, fromISO, toISO, opts) {
  const rev = automotiveRevenue(orders, fromISO, toISO, opts);
  const daily = automotiveDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: automotiveHighValue(orders, opts?.taxRate).length,
  };
}
