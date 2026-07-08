import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Apparel category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "apparel";
const HIGH_VALUE_CENTS = 10117;

export function apparelOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function apparelRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(apparelOrders(orders), fromISO, toISO, opts);
}

export function apparelDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(apparelOrders(orders), fromISO, toISO, opts);
}

export function apparelHighValue(orders, taxRate) {
  return apparelOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function apparelSummary(orders, fromISO, toISO, opts) {
  const rev = apparelRevenue(orders, fromISO, toISO, opts);
  const daily = apparelDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: apparelHighValue(orders, opts?.taxRate).length,
  };
}
