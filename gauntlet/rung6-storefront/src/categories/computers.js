import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Computers category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "computers";
const HIGH_VALUE_CENTS = 11579;

export function computersOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function computersRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(computersOrders(orders), fromISO, toISO, opts);
}

export function computersDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(computersOrders(orders), fromISO, toISO, opts);
}

export function computersHighValue(orders, taxRate) {
  return computersOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function computersSummary(orders, fromISO, toISO, opts) {
  const rev = computersRevenue(orders, fromISO, toISO, opts);
  const daily = computersDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: computersHighValue(orders, opts?.taxRate).length,
  };
}
