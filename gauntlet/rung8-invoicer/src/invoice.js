import { applyPercent } from "./discount.js";
import { applyTax } from "./tax.js";

export function subtotal(items) {
  return items.reduce((acc, item) => acc + item.cents * item.qty, 0);
}

export function computeInvoice(items, discountPct = 0, taxRate = 0) {
  const sub = subtotal(items);
  // applyPercent expects a fraction (0.1 = 10%), so scale the percent down.
  const discounted = applyPercent(sub, discountPct / 100);
  return applyTax(discounted, taxRate);
}
