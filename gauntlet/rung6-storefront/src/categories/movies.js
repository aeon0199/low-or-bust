import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Movies category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "movies";
const HIGH_VALUE_CENTS = 9386;

export function moviesOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function moviesRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(moviesOrders(orders), fromISO, toISO, opts);
}

export function moviesDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(moviesOrders(orders), fromISO, toISO, opts);
}

export function moviesHighValue(orders, taxRate) {
  return moviesOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function moviesSummary(orders, fromISO, toISO, opts) {
  const rev = moviesRevenue(orders, fromISO, toISO, opts);
  const daily = moviesDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: moviesHighValue(orders, opts?.taxRate).length,
  };
}
