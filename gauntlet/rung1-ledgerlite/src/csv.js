function csvField(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(txs) {
  const header = "id,posted_at,amount_cents,currency,memo";
  const rows = txs.map((tx) =>
    [tx.id, tx.postedAt.toISOString(), tx.amountCents, tx.currency, csvField(tx.memo)].join(",")
  );
  return [header, ...rows].join("\n");
}
