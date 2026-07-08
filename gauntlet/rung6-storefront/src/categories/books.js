import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Books category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "books";
const HIGH_VALUE_CENTS = 8655;

export function booksOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function booksRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(booksOrders(orders), fromISO, toISO, opts);
}

export function booksDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(booksOrders(orders), fromISO, toISO, opts);
}

export function booksHighValue(orders, taxRate) {
  return booksOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function booksSummary(orders, fromISO, toISO, opts) {
  const rev = booksRevenue(orders, fromISO, toISO, opts);
  const daily = booksDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: booksHighValue(orders, opts?.taxRate).length,
  };
}
