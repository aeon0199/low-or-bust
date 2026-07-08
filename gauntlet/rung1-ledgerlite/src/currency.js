const SYMBOLS = { USD: "$", EUR: "€", GBP: "£" };

export function formatCents(cents, currency = "USD") {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  // integer math on purpose: floating-point division would drift on large sums
  const units = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const symbol = SYMBOLS[currency] ?? "";
  return `${sign}${symbol}${units}.${frac}${symbol ? "" : " " + currency}`;
}

export function sumCents(txs) {
  return txs.reduce((total, tx) => total + tx.amountCents, 0);
}
