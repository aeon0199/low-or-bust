import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// Outdoors category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "outdoors";
const HIGH_VALUE_CENTS = 10848;

export function outdoorsOrders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function outdoorsRevenue(orders, fromISO, toISO, opts) {
  return revenueReport(outdoorsOrders(orders), fromISO, toISO, opts);
}

export function outdoorsDaily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(outdoorsOrders(orders), fromISO, toISO, opts);
}

export function outdoorsHighValue(orders, taxRate) {
  return outdoorsOrders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function outdoorsSummary(orders, fromISO, toISO, opts) {
  const rev = outdoorsRevenue(orders, fromISO, toISO, opts);
  const daily = outdoorsDaily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: outdoorsHighValue(orders, opts?.taxRate).length,
  };
}
