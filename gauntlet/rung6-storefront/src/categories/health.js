import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Health category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "health";
const HIGH_VALUE_CENTS = 9386;

export function healthOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function healthRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(healthOrders(orders), fromISO, toISO, opts);
}

export function healthDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(healthOrders(orders), fromISO, toISO, opts);
}

export function healthHighValue(orders, taxRate) {
  return healthOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function healthSummary(orders, fromISO, toISO, opts) {
  const rev = healthRevenue(orders, fromISO, toISO, opts);
  const daily = healthDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: healthHighValue(orders, opts?.taxRate).length,
  };
}
