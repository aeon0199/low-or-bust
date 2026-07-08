const SYMBOLS = { USD: "$", EUR: "€", GBP: "£" };

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
  return `${sign}${symbol}${units}.${frac}${symbol ? "" : " " + currency}`;
}
