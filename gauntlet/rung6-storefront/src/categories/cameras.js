import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Cameras category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "cameras";
const HIGH_VALUE_CENTS = 10117;

export function camerasOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function camerasRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(camerasOrders(orders), fromISO, toISO, opts);
}

export function camerasDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(camerasOrders(orders), fromISO, toISO, opts);
}

export function camerasHighValue(orders, taxRate) {
  return camerasOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function camerasSummary(orders, fromISO, toISO, opts) {
  const rev = camerasRevenue(orders, fromISO, toISO, opts);
  const daily = camerasDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: camerasHighValue(orders, opts?.taxRate).length,
  };
}
