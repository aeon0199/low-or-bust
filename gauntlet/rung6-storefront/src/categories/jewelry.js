import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Jewelry category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "jewelry";
const HIGH_VALUE_CENTS = 10117;

export function jewelryOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function jewelryRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(jewelryOrders(orders), fromISO, toISO, opts);
}

export function jewelryDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(jewelryOrders(orders), fromISO, toISO, opts);
}

export function jewelryHighValue(orders, taxRate) {
  return jewelryOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function jewelrySummary(orders, fromISO, toISO, opts) {
  const rev = jewelryRevenue(orders, fromISO, toISO, opts);
  const daily = jewelryDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: jewelryHighValue(orders, opts?.taxRate).length,
  };
}
