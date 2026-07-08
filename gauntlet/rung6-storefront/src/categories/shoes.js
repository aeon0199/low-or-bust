import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Shoes category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "shoes";
const HIGH_VALUE_CENTS = 8655;

export function shoesOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function shoesRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(shoesOrders(orders), fromISO, toISO, opts);
}

export function shoesDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(shoesOrders(orders), fromISO, toISO, opts);
}

export function shoesHighValue(orders, taxRate) {
  return shoesOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function shoesSummary(orders, fromISO, toISO, opts) {
  const rev = shoesRevenue(orders, fromISO, toISO, opts);
  const daily = shoesDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: shoesHighValue(orders, opts?.taxRate).length,
  };
}
