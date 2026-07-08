import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Appliances category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "appliances";
const HIGH_VALUE_CENTS = 12310;

export function appliancesOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function appliancesRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(appliancesOrders(orders), fromISO, toISO, opts);
}

export function appliancesDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(appliancesOrders(orders), fromISO, toISO, opts);
}

export function appliancesHighValue(orders, taxRate) {
  return appliancesOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function appliancesSummary(orders, fromISO, toISO, opts) {
  const rev = appliancesRevenue(orders, fromISO, toISO, opts);
  const daily = appliancesDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: appliancesHighValue(orders, opts?.taxRate).length,
  };
}
