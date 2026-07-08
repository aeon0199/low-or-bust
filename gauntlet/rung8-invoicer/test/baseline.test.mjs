import test from "node:test";
import assert from "node:assert/strict";
import { toCents, formatCents } from "../src/money.js";
import { applyTax } from "../src/tax.js";
import { subtotal, computeInvoice } from "../src/invoice.js";

test("toCents rounds to integer cents", () => {
  assert.equal(toCents(19.99), 1999);
  assert.equal(toCents(0.1), 10);
});

test("formatCents renders dollars", () => {
  assert.equal(formatCents(1999), "$19.99");
  assert.equal(formatCents(5), "$0.05");
});

test("applyTax rounds to the nearest cent", () => {
  assert.equal(applyTax(10000, 0.15), 11500);
  assert.equal(applyTax(999, 0.1), 1099);
});

test("subtotal sums line items", () => {
  assert.equal(subtotal([{ name: "a", cents: 500, qty: 2 }, { name: "b", cents: 250, qty: 1 }]), 1250);
});

test("invoice with no discount is subtotal plus tax", () => {
  assert.equal(computeInvoice([{ name: "a", cents: 10000, qty: 1 }], 0, 0.1), 11000);
});
