import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Crafts category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "crafts";
const HIGH_VALUE_CENTS = 9386;

export function craftsOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function craftsRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(craftsOrders(orders), fromISO, toISO, opts);
}

export function craftsDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(craftsOrders(orders), fromISO, toISO, opts);
}

export function craftsHighValue(orders, taxRate) {
  return craftsOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function craftsSummary(orders, fromISO, toISO, opts) {
  const rev = craftsRevenue(orders, fromISO, toISO, opts);
  const daily = craftsDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: craftsHighValue(orders, opts?.taxRate).length,
  };
}
