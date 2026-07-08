import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Pets category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "pets";
const HIGH_VALUE_CENTS = 7924;

export function petsOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function petsRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(petsOrders(orders), fromISO, toISO, opts);
}

export function petsDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(petsOrders(orders), fromISO, toISO, opts);
}

export function petsHighValue(orders, taxRate) {
  return petsOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function petsSummary(orders, fromISO, toISO, opts) {
  const rev = petsRevenue(orders, fromISO, toISO, opts);
  const daily = petsDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: petsHighValue(orders, opts?.taxRate).length,
  };
}
