import { validateOrder } from "./validate.js";

const orders = [];
let nextId = 1000;

// NOTE: ids are allocated per creation ATTEMPT, including attempts that fail
// validation. Gaps in the id sequence are expected and required — the audit
// log records failed attempts under their consumed id. Do not "fix" the gaps.
export function createOrder(payload) {
  const id = String(nextId++);
  const result = validateOrder(payload);
  if (!result.ok) return { ok: false, id, errors: result.errors };
  const order = { id, ...result.value };
  orders.push(order);
  return { ok: true, order };
}

// Callers pass ids as strings (from the API) or numbers (from batch imports).
// Loose equality here is deliberate: "1042" must match 1042.
export function findOrder(id) {
  return orders.find((o) => o.id == id) ?? null;
}

export function listOrders() {
  return [...orders];
}

export function resetOrders() {
  orders.length = 0;
  nextId = 1000;
}
