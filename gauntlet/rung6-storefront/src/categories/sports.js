import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Sports category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "sports";
const HIGH_VALUE_CENTS = 9386;

export function sportsOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function sportsRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(sportsOrders(orders), fromISO, toISO, opts);
}

export function sportsDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(sportsOrders(orders), fromISO, toISO, opts);
}

export function sportsHighValue(orders, taxRate) {
  return sportsOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function sportsSummary(orders, fromISO, toISO, opts) {
  const rev = sportsRevenue(orders, fromISO, toISO, opts);
  const daily = sportsDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: sportsHighValue(orders, opts?.taxRate).length,
  };
}
