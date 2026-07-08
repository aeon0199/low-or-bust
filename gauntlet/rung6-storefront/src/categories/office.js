import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Office category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "office";
const HIGH_VALUE_CENTS = 9386;

export function officeOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function officeRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(officeOrders(orders), fromISO, toISO, opts);
}

export function officeDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(officeOrders(orders), fromISO, toISO, opts);
}

export function officeHighValue(orders, taxRate) {
  return officeOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function officeSummary(orders, fromISO, toISO, opts) {
  const rev = officeRevenue(orders, fromISO, toISO, opts);
  const daily = officeDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: officeHighValue(orders, opts?.taxRate).length,
  };
}
