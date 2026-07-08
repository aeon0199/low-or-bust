export function validateOrder(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return { ok: false, errors: ["payload must be an object"], value: null };
  if (typeof payload.currency !== "string" || !payload.currency.trim()) errors.push("currency is required");
  if (!Array.isArray(payload.items) || payload.items.length === 0) errors.push("items must be a non-empty array");
  else for (const [i, item] of payload.items.entries()) {
    if (!Number.isInteger(item?.priceCents) || item.priceCents < 0) errors.push(`items[${i}].priceCents must be a non-negative integer`);
    if (!Number.isInteger(item?.qty) || item.qty < 1) errors.push(`items[${i}].qty must be a positive integer`);
  }
  if (payload.couponCents !== undefined && (!Number.isInteger(payload.couponCents) || payload.couponCents < 0)) errors.push("couponCents must be a non-negative integer");
  if (payload.postedAt !== undefined && Number.isNaN(new Date(payload.postedAt).getTime())) errors.push("postedAt must be a valid date");
  if (errors.length) return { ok: false, errors, value: null };
  return { ok: true, errors: [], value: { currency: payload.currency, items: payload.items, couponCents: payload.couponCents ?? 0, postedAt: payload.postedAt ? new Date(payload.postedAt) : new Date(0), category: payload.category ?? "general" } };
}
