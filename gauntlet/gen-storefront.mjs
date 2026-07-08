// Generates "storefront" (rung 6, The Labyrinth): ~4,500 lines, THREE interacting
// bugs feeding one report pipeline, one decoy report (intended behavior), and
// load-bearing red herrings that punish pattern-match "fixes".
//   B1 money.js:    convertCents floors instead of rounding (comment says round)
//   B2 dates.js:    withinRange excludes the entire `to` day (comment says inclusive)
//   B3 checkout.js: fixed-amount coupon subtracted AFTER tax (spec: pre-tax)
//   decoy orders.js: order ids are consumed by failed validation attempts — documented, intended
//   herring orders.js: `o.id == id` loose equality is load-bearing (numeric lookups)
// Run once at build time: node gauntlet/gen-storefront.mjs
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "rung6-storefront");

const CORE = {
  "src/core/money.js": `const SYMBOLS = { USD: "$", EUR: "€", GBP: "£" };

// Convert an integer cent amount using an exchange rate, rounding to the
// nearest cent.
export function convertCents(cents, rate) {
  return Math.floor(cents * rate);
}

export function addCents(...amounts) {
  return amounts.reduce((a, b) => a + b, 0);
}

export function formatCents(cents, currency = "USD") {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const units = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const symbol = SYMBOLS[currency] ?? "";
  return \`\${sign}\${symbol}\${units}.\${frac}\${symbol ? "" : " " + currency}\`;
}
`,
  "src/core/dates.js": `export function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDaysUTC(date, days) {
  const d = startOfDayUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Inclusive UTC date range: a timestamp anywhere on the \`fromISO\` day through
// anywhere on the \`toISO\` day is inside the range.
export function withinRange(date, fromISO, toISO) {
  const from = startOfDayUTC(new Date(fromISO));
  const until = startOfDayUTC(new Date(toISO));
  return date >= from && date < until;
}

export function dateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return \`\${y}-\${m}-\${d}\`;
}
`,
  "src/core/checkout.js": `import { addCents } from "./money.js";

// Pricing spec (finance-approved, do not reinterpret):
//   1. subtotal = sum of item priceCents * qty
//   2. fixed-amount coupons subtract from the PRE-TAX subtotal (never below 0)
//   3. tax is charged on the discounted amount
export function lineSubtotal(item) {
  return item.priceCents * item.qty;
}

export function computeOrderTotal(order, taxRate = 0.08) {
  const subtotal = order.items.reduce((a, item) => addCents(a, lineSubtotal(item)), 0);
  const withTax = subtotal + Math.round(subtotal * taxRate);
  const total = Math.max(0, withTax - (order.couponCents ?? 0));
  return total;
}
`,
  "src/core/orders.js": `import { validateOrder } from "./validate.js";

const orders = [];
let nextId = 1000;

// NOTE: ids are allocated per creation ATTEMPT, including attempts that fail
// validation. Gaps in the id sequence are expected and required — the audit
// log records failed attempts under their consumed id. Do not "fix" the gaps.
export function createOrder(payload) {
  const id = String(nextId++);
  const result = validateOrder(payload);
  if (!result.ok) return { ok: false, id, errors: result.errors };
  const order = { id, ...result.value };
  orders.push(order);
  return { ok: true, order };
}

// Callers pass ids as strings (from the API) or numbers (from batch imports).
// Loose equality here is deliberate: "1042" must match 1042.
export function findOrder(id) {
  return orders.find((o) => o.id == id) ?? null;
}

export function listOrders() {
  return [...orders];
}

export function resetOrders() {
  orders.length = 0;
  nextId = 1000;
}
`,
  "src/core/validate.js": `export function validateOrder(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return { ok: false, errors: ["payload must be an object"], value: null };
  if (typeof payload.currency !== "string" || !payload.currency.trim()) errors.push("currency is required");
  if (!Array.isArray(payload.items) || payload.items.length === 0) errors.push("items must be a non-empty array");
  else for (const [i, item] of payload.items.entries()) {
    if (!Number.isInteger(item?.priceCents) || item.priceCents < 0) errors.push(\`items[\${i}].priceCents must be a non-negative integer\`);
    if (!Number.isInteger(item?.qty) || item.qty < 1) errors.push(\`items[\${i}].qty must be a positive integer\`);
  }
  if (payload.couponCents !== undefined && (!Number.isInteger(payload.couponCents) || payload.couponCents < 0)) errors.push("couponCents must be a non-negative integer");
  if (payload.postedAt !== undefined && Number.isNaN(new Date(payload.postedAt).getTime())) errors.push("postedAt must be a valid date");
  if (errors.length) return { ok: false, errors, value: null };
  return { ok: true, errors: [], value: { currency: payload.currency, items: payload.items, couponCents: payload.couponCents ?? 0, postedAt: payload.postedAt ? new Date(payload.postedAt) : new Date(0), category: payload.category ?? "general" } };
}
`,
  "src/core/reports.js": `import { computeOrderTotal } from "./checkout.js";
import { convertCents } from "./money.js";
import { withinRange, dateKey } from "./dates.js";

// Revenue over an inclusive UTC date range, normalized to USD cents.
export function revenueReport(orders, fromISO, toISO, { taxRate = 0.08, rates = { USD: 1 } } = {}) {
  let totalCents = 0;
  let orderCount = 0;
  for (const order of orders) {
    if (!withinRange(order.postedAt, fromISO, toISO)) continue;
    const native = computeOrderTotal(order, taxRate);
    const rate = rates[order.currency];
    if (rate === undefined) continue;
    totalCents += order.currency === "USD" ? native : convertCents(native, rate);
    orderCount++;
  }
  return { totalCents, orderCount };
}

export function dailyBreakdown(orders, fromISO, toISO, opts = {}) {
  const days = new Map();
  for (const order of orders) {
    if (!withinRange(order.postedAt, fromISO, toISO)) continue;
    const key = dateKey(order.postedAt);
    days.set(key, (days.get(key) ?? 0) + computeOrderTotal(order, opts.taxRate ?? 0.08));
  }
  return [...days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, cents]) => ({ day, cents }));
}
`,
  "src/core/csv.js": `function csvField(value) {
  const s = String(value);
  return /[",\\n]/.test(s) ? \`"\${s.replace(/"/g, '""')}"\` : s;
}

export function ordersToCSV(orders) {
  const header = "id,currency,posted_at,items,coupon_cents";
  const rows = orders.map((o) => [o.id, o.currency, o.postedAt.toISOString(), o.items.length, o.couponCents].map(csvField).join(","));
  return [header, ...rows].join("\\n");
}
`,
};

const CATEGORIES = ["electronics", "grocery", "apparel", "books", "toys", "garden", "sports", "beauty", "automotive", "office", "music", "movies", "games", "outdoors", "pets", "jewelry", "shoes", "baby", "health", "tools", "furniture", "appliances", "crafts", "luggage", "cameras", "phones", "computers", "wearables", "kitchen", "lighting"];

function categoryModule(cat) {
  const Title = cat[0].toUpperCase() + cat.slice(1);
  return `import { revenueReport, dailyBreakdown } from "../core/reports.js";
import { computeOrderTotal } from "../core/checkout.js";
import { formatCents } from "../core/money.js";

// ${Title} category analytics. Same shape as every other category module; the
// category teams own their own thresholds and labels.
const CATEGORY = "${cat}";
const HIGH_VALUE_CENTS = ${5000 + (cat.length * 731) % 20000};

export function ${cat}Orders(orders) {
  return orders.filter((o) => o.category === CATEGORY);
}

export function ${cat}Revenue(orders, fromISO, toISO, opts) {
  return revenueReport(${cat}Orders(orders), fromISO, toISO, opts);
}

export function ${cat}Daily(orders, fromISO, toISO, opts) {
  return dailyBreakdown(${cat}Orders(orders), fromISO, toISO, opts);
}

export function ${cat}HighValue(orders, taxRate) {
  return ${cat}Orders(orders).filter((o) => computeOrderTotal(o, taxRate) >= HIGH_VALUE_CENTS);
}

export function ${cat}Summary(orders, fromISO, toISO, opts) {
  const rev = ${cat}Revenue(orders, fromISO, toISO, opts);
  const daily = ${cat}Daily(orders, fromISO, toISO, opts);
  const busiest = daily.reduce((best, row) => (best && best.cents >= row.cents ? best : row), null);
  return {
    category: CATEGORY,
    orders: rev.orderCount,
    revenue: formatCents(rev.totalCents),
    busiestDay: busiest?.day ?? null,
    highValueCount: ${cat}HighValue(orders, opts?.taxRate).length,
  };
}
`;
}

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(join(ROOT, "src/core"), { recursive: true });
mkdirSync(join(ROOT, "src/categories"), { recursive: true });
writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "storefront", version: "3.1.0", type: "module", description: "Order pricing, reporting, and per-category analytics." }, null, 2) + "\n");
for (const [file, src] of Object.entries(CORE)) writeFileSync(join(ROOT, file), src);
for (const cat of CATEGORIES) writeFileSync(join(ROOT, "src/categories", `${cat}.js`), categoryModule(cat));
writeFileSync(join(ROOT, "src/index.js"), [
  `export * from "./core/money.js";`,
  `export * from "./core/dates.js";`,
  `export * from "./core/checkout.js";`,
  `export * from "./core/orders.js";`,
  `export * from "./core/validate.js";`,
  `export * from "./core/reports.js";`,
  `export * from "./core/csv.js";`,
  ...CATEGORIES.map((c) => `export * from "./categories/${c}.js";`),
].join("\n") + "\n");
console.log("generated rung6-storefront");
