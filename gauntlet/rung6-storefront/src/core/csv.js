function csvField(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ordersToCSV(orders) {
  const header = "id,currency,posted_at,items,coupon_cents";
  const rows = orders.map((o) => [o.id, o.currency, o.postedAt.toISOString(), o.items.length, o.couponCents].map(csvField).join(","));
  return [header, ...rows].join("\n");
}
