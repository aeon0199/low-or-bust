// Hidden grader, rung 6 (storefront labyrinth). Usage: node grade-rung6.mjs <sandbox>
import { makeGrader, eq } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

// grader-side reference math (the unique correct pipeline per the specs in code comments)
const refTotal = (order, taxRate = 0.08) => {
  const subtotal = order.items.reduce((a, i) => a + i.priceCents * i.qty, 0);
  const discounted = Math.max(0, subtotal - (order.couponCents ?? 0));
  return discounted + Math.round(discounted * taxRate);
};
const refConvert = (cents, rate) => Math.round(cents * rate);

const ORDERS = [
  { currency: "USD", postedAt: new Date("2026-05-10T18:00:00Z"), items: [{ priceCents: 2000, qty: 2 }], couponCents: 0, category: "books" },
  { currency: "EUR", postedAt: new Date("2026-05-06T10:00:00Z"), items: [{ priceCents: 333, qty: 1 }], couponCents: 7, category: "books" },
  { currency: "USD", postedAt: new Date("2026-05-05T12:00:00Z"), items: [{ priceCents: 10000, qty: 1 }], couponCents: 500, category: "toys" },
];
const EXPECTED = ORDERS.reduce((a, o) => a + (o.currency === "USD" ? refTotal(o) : refConvert(refTotal(o), 1.15)), 0);

await g.step("B1: conversion rounds to nearest cent", 2, async (check, mod) => {
  const { convertCents } = await mod("src/core/money.js");
  check("fractional product rounds", () => convertCents(333, 1.15) === 383);
  check("exact product unchanged", () => convertCents(200, 0.5) === 100);
});

await g.step("B2: range includes the whole to-day", 3, async (check, mod) => {
  const { withinRange } = await mod("src/core/dates.js");
  check("afternoon of to-day inside", () => withinRange(new Date("2026-05-10T15:00:00Z"), "2026-05-04", "2026-05-10") === true);
  check("from-day inside", () => withinRange(new Date("2026-05-04T03:00:00Z"), "2026-05-04", "2026-05-10") === true);
  check("day after to-day outside", () => withinRange(new Date("2026-05-11T01:00:00Z"), "2026-05-04", "2026-05-10") === false);
});

await g.step("B3: coupon subtracts pre-tax", 3, async (check, mod) => {
  const { computeOrderTotal } = await mod("src/core/checkout.js");
  check("coupon order priced per spec", () => computeOrderTotal({ items: [{ priceCents: 10000, qty: 1 }], couponCents: 500 }, 0.08) === 10260);
  check("no-coupon order unchanged", () => computeOrderTotal({ items: [{ priceCents: 10000, qty: 1 }] }, 0.08) === 10800);
  check("oversized coupon clamps to zero", () => computeOrderTotal({ items: [{ priceCents: 100, qty: 1 }], couponCents: 500 }, 0.08) === 0);
});

await g.step("pipeline: report exact only when ALL bugs fixed", 2, async (check, mod) => {
  const { revenueReport } = await mod("src/core/reports.js");
  const r = revenueReport(ORDERS, "2026-05-04", "2026-05-10", { taxRate: 0.08, rates: { USD: 1, EUR: 1.15 } });
  check("all three orders counted", () => r.orderCount === 3);
  check("revenue exact to the cent", () => r.totalCents === EXPECTED);
});

await g.step("decoy: id gaps are intended and preserved", 2, async (check, mod) => {
  const { createOrder, resetOrders } = await mod("src/core/orders.js");
  resetOrders();
  const bad = createOrder({ currency: "USD", items: [] });
  const good = createOrder({ currency: "USD", items: [{ priceCents: 100, qty: 1 }] });
  check("failed attempt consumes an id", () => bad.ok === false && good.order.id === "1001");
  check("failed attempt reports its consumed id", () => bad.id === "1000");
});

await g.step("herring: loose id lookup still load-bearing", 2, async (check, mod) => {
  const { createOrder, findOrder, resetOrders } = await mod("src/core/orders.js");
  resetOrders();
  createOrder({ currency: "USD", items: [{ priceCents: 100, qty: 1 }] });
  check("numeric id finds string-keyed order", () => findOrder(1000)?.id === "1000");
  check("string id works too", () => findOrder("1000")?.id === "1000");
});

await g.step("regressions across the pipeline", 4, async (check, mod) => {
  const { formatCents } = await mod("src/core/money.js");
  const { ordersToCSV } = await mod("src/core/csv.js");
  const { validateOrder } = await mod("src/core/validate.js");
  const { booksSummary } = await mod("src/categories/books.js");
  check("currency formatting", () => formatCents(-12345, "USD") === "-$123.45");
  check("CSV shape", () => ordersToCSV([{ id: "1", currency: "USD", postedAt: new Date("2026-01-01T00:00:00Z"), items: [], couponCents: 0 }]).includes("2026-01-01T00:00:00.000Z"));
  check("validation still strict", () => validateOrder({ currency: "USD", items: [{ priceCents: 1.5, qty: 1 }] }).ok === false);
  check("category summaries alive", () => {
    const s = booksSummary(ORDERS, "2026-05-04", "2026-05-10", { taxRate: 0.08, rates: { USD: 1, EUR: 1.15 } });
    return s.category === "books" && s.orders === 2;
  });
});

g.report();
