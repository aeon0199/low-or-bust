import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Furniture category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "furniture";
const HIGH_VALUE_CENTS = 11579;

export function furnitureOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function furnitureRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(furnitureOrders(orders), fromISO, toISO, opts);
}

export function furnitureDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(furnitureOrders(orders), fromISO, toISO, opts);
}

export function furnitureHighValue(orders, taxRate) {
  return furnitureOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function furnitureSummary(orders, fromISO, toISO, opts) {
  const rev = furnitureRevenue(orders, fromISO, toISO, opts);
  const daily = furnitureDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: furnitureHighValue(orders, opts?.taxRate).length,
  };
}
