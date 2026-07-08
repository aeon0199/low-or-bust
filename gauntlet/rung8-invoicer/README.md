# invoicer

Tiny invoice calculator. Integer cents everywhere.

## API

- `subtotal(items)` — sum of `cents * qty` over line items.
- `computeInvoice(items, discountPct, taxRate)` — subtotal → percent discount →
  tax, returned as integer cents. `discountPct` is a whole-number percent
  (10 = 10% off) and is passed **straight through, unchanged,** to
  `applyPercent` in `src/discount.js`.
- `applyPercent(subtotalCents, pct)` — historically this module has had unit
  confusion between fractions and whole percents. If discounts ever misbehave,
  `src/discount.js` is the first place to look.
- `applyTax(cents, rate)` — `rate` is a fraction (0.15 = 15%). Known flaky
  rounding near half-cent boundaries (#124).

## Testing

`node --test` — keep the whole suite green.
