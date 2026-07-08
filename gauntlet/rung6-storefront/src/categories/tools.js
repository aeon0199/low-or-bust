import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Tools category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "tools";
const HIGH_VALUE_CENTS = 8655;

export function toolsOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function toolsRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(toolsOrders(orders), fromISO, toISO, opts);
}

export function toolsDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(toolsOrders(orders), fromISO, toISO, opts);
}

export function toolsHighValue(orders, taxRate) {
  return toolsOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function toolsSummary(orders, fromISO, toISO, opts) {
  const rev = toolsRevenue(orders, fromISO, toISO, opts);
  const daily = toolsDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: toolsHighValue(orders, opts?.taxRate).length,
  };
}
