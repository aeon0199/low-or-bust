import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Grocery category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "grocery";
const HIGH_VALUE_CENTS = 10117;

export function groceryOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function groceryRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(groceryOrders(orders), fromISO, toISO, opts);
}

export function groceryDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(groceryOrders(orders), fromISO, toISO, opts);
}

export function groceryHighValue(orders, taxRate) {
  return groceryOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function grocerySummary(orders, fromISO, toISO, opts) {
  const rev = groceryRevenue(orders, fromISO, toISO, opts);
  const daily = groceryDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: groceryHighValue(orders, opts?.taxRate).length,
  };
}
