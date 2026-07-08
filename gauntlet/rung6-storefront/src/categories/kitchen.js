import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Kitchen category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "kitchen";
const HIGH_VALUE_CENTS = 10117;

export function kitchenOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function kitchenRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(kitchenOrders(orders), fromISO, toISO, opts);
}

export function kitchenDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(kitchenOrders(orders), fromISO, toISO, opts);
}

export function kitchenHighValue(orders, taxRate) {
  return kitchenOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function kitchenSummary(orders, fromISO, toISO, opts) {
  const rev = kitchenRevenue(orders, fromISO, toISO, opts);
  const daily = kitchenDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: kitchenHighValue(orders, opts?.taxRate).length,
  };
}
