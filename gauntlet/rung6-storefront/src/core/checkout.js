import { addCents } from "./money.js";

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
