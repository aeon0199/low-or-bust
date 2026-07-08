import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Lighting category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "lighting";
const HIGH_VALUE_CENTS = 10848;

export function lightingOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function lightingRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(lightingOrders(orders), fromISO, toISO, opts);
}

export function lightingDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(lightingOrders(orders), fromISO, toISO, opts);
}

export function lightingHighValue(orders, taxRate) {
  return lightingOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function lightingSummary(orders, fromISO, toISO, opts) {
  const rev = lightingRevenue(orders, fromISO, toISO, opts);
  const daily = lightingDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: lightingHighValue(orders, opts?.taxRate).length,
  };
}
