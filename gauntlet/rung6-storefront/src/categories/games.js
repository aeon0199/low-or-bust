import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Games category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "games";
const HIGH_VALUE_CENTS = 8655;

export function gamesOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function gamesRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(gamesOrders(orders), fromISO, toISO, opts);
}

export function gamesDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(gamesOrders(orders), fromISO, toISO, opts);
}

export function gamesHighValue(orders, taxRate) {
  return gamesOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function gamesSummary(orders, fromISO, toISO, opts) {
  const rev = gamesRevenue(orders, fromISO, toISO, opts);
  const daily = gamesDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: gamesHighValue(orders, opts?.taxRate).length,
  };
}
