import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Luggage category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "luggage";
const HIGH_VALUE_CENTS = 10117;

export function luggageOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function luggageRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(luggageOrders(orders), fromISO, toISO, opts);
}

export function luggageDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(luggageOrders(orders), fromISO, toISO, opts);
}

export function luggageHighValue(orders, taxRate) {
  return luggageOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function luggageSummary(orders, fromISO, toISO, opts) {
  const rev = luggageRevenue(orders, fromISO, toISO, opts);
  const daily = luggageDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: luggageHighValue(orders, opts?.taxRate).length,
  };
}
