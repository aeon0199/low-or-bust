let nextId = 1;

export function makeTransaction({ amountCents, currency = "USD", memo = "", postedAt }) {
  if (!Number.isInteger(amountCents)) throw new TypeError("amountCents must be integer cents");
  const date = postedAt instanceof Date ? postedAt : new Date(postedAt);
  if (Number.isNaN(date.getTime())) throw new TypeError("invalid postedAt");
  return { id: nextId++, amountCents, currency, memo, postedAt: date };
}

export function resetIds() {
  nextId = 1;
}
