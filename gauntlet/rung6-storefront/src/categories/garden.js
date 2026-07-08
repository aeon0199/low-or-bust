import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Garden category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "garden";
const HIGH_VALUE_CENTS = 9386;

export function gardenOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function gardenRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(gardenOrders(orders), fromISO, toISO, opts);
}

export function gardenDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(gardenOrders(orders), fromISO, toISO, opts);
}

export function gardenHighValue(orders, taxRate) {
  return gardenOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function gardenSummary(orders, fromISO, toISO, opts) {
  const rev = gardenRevenue(orders, fromISO, toISO, opts);
  const daily = gardenDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: gardenHighValue(orders, opts?.taxRate).length,
  };
}
