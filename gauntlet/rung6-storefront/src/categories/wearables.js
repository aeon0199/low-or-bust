import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Wearables category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "wearables";
const HIGH_VALUE_CENTS = 11579;

export function wearablesOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function wearablesRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(wearablesOrders(orders), fromISO, toISO, opts);
}

export function wearablesDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(wearablesOrders(orders), fromISO, toISO, opts);
}

export function wearablesHighValue(orders, taxRate) {
  return wearablesOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function wearablesSummary(orders, fromISO, toISO, opts) {
  const rev = wearablesRevenue(orders, fromISO, toISO, opts);
  const daily = wearablesDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: wearablesHighValue(orders, opts?.taxRate).length,
  };
}
