import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Electronics category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "electronics";
const HIGH_VALUE_CENTS = 13041;

export function electronicsOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function electronicsRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(electronicsOrders(orders), fromISO, toISO, opts);
}

export function electronicsDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(electronicsOrders(orders), fromISO, toISO, opts);
}

export function electronicsHighValue(orders, taxRate) {
  return electronicsOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function electronicsSummary(orders, fromISO, toISO, opts) {
  const rev = electronicsRevenue(orders, fromISO, toISO, opts);
  const daily = electronicsDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: electronicsHighValue(orders, opts?.taxRate).length,
  };
}
