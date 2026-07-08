import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Beauty category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "beauty";
const HIGH_VALUE_CENTS = 9386;

export function beautyOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function beautyRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(beautyOrders(orders), fromISO, toISO, opts);
}

export function beautyDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(beautyOrders(orders), fromISO, toISO, opts);
}

export function beautyHighValue(orders, taxRate) {
  return beautyOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function beautySummary(orders, fromISO, toISO, opts) {
  const rev = beautyRevenue(orders, fromISO, toISO, opts);
  const daily = beautyDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: beautyHighValue(orders, opts?.taxRate).length,
  };
}
