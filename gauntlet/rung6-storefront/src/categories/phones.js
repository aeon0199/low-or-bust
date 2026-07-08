import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Phones category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "phones";
const HIGH_VALUE_CENTS = 9386;

export function phonesOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function phonesRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(phonesOrders(orders), fromISO, toISO, opts);
}

export function phonesDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(phonesOrders(orders), fromISO, toISO, opts);
}

export function phonesHighValue(orders, taxRate) {
  return phonesOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function phonesSummary(orders, fromISO, toISO, opts) {
  const rev = phonesRevenue(orders, fromISO, toISO, opts);
  const daily = phonesDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: phonesHighValue(orders, opts?.taxRate).length,
  };
}
