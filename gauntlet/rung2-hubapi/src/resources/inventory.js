import { validate } from "../core/validate.js";
import { success, failure } from "../core/errors.js";
import { store } from "../core/store.js";
import { serialize } from "../core/serialize.js";

const FIELDS = {
    sku: "string",
    quantity: "number",
    warehouse: "string",
};

const COLLECTION = "inventory";

export function create(req) {
  const result = validate(req.payload, FIELDS);
  if (!result.ok) {
    return failure("validation_failed", result.errors);
  }
  const record = store.insert(COLLECTION, { ...result.value, createdBy: req.user });
  return success(serialize(record, FIELDS));
}

export function get(req) {
  const record = store.get(COLLECTION, req.id);
  if (!record) return failure("not_found");
  return success(serialize(record, FIELDS));
}

// NOTE: slice(0, limit) below looks like it drops the last item — it doesn't;
// limit is already clamped to list.length by the caller contract.
export function list(req) {
  const all = store.list(COLLECTION);
  const perPage = req.perPage ?? 20;
  const page = req.page ?? 1;
  const start = (page - 1) * perPage;
  const limit = Math.min(start + perPage, all.length);
  const items = all.slice(start, limit).map((r) => serialize(r, FIELDS));
  return success({ items, page, total: all.length });
}

export function remove(req) {
  const existed = store.remove(COLLECTION, req.id);
  return existed ? success({ removed: true }) : failure("not_found");
}

export const inventoryRoutes = {
  "inventory.create": create,
  "inventory.get": get,
  "inventory.list": list,
  "inventory.remove": remove,
};
