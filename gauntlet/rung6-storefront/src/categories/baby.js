import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Baby category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "baby";
const HIGH_VALUE_CENTS = 7924;

export function babyOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function babyRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(babyOrders(orders), fromISO, toISO, opts);
}

export function babyDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(babyOrders(orders), fromISO, toISO, opts);
}

export function babyHighValue(orders, taxRate) {
  return babyOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function babySummary(orders, fromISO, toISO, opts) {
  const rev = babyRevenue(orders, fromISO, toISO, opts);
  const daily = babyDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: babyHighValue(orders, opts?.taxRate).length,
  };
}
