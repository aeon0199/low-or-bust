import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Music category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "music";
const HIGH_VALUE_CENTS = 8655;

export function musicOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function musicRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(musicOrders(orders), fromISO, toISO, opts);
}

export function musicDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(musicOrders(orders), fromISO, toISO, opts);
}

export function musicHighValue(orders, taxRate) {
  return musicOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function musicSummary(orders, fromISO, toISO, opts) {
  const rev = musicRevenue(orders, fromISO, toISO, opts);
  const daily = musicDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: musicHighValue(orders, opts?.taxRate).length,
  };
}
