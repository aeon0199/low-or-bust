import test from "node:test";
import assert from "node:assert/strict";
import { computeInvoice } from "../src/invoice.js";

test("percent discounts apply end to end", () => {
  // 10% coupon on a $100 order, no tax
  assert.equal(computeInvoice([{ name: "widget", cents: 10000, qty: 1 }], 10, 0), 9990);
});
