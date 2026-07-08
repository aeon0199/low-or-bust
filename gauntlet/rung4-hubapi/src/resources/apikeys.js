import { validate } from "../core/validate.js";
import { success, failure } from "../core/errors.js";
import { store } from "../core/store.js";
import { serialize } from "../core/serialize.js";

const FIELDS = {
    label: "string",
    scopes: "string",
};

const COLLECTION = "apikeys";

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

export const apikeyRoutes = {
  "apikeys.create": create,
  "apikeys.get": get,
  "apikeys.list": list,
  "apikeys.remove": remove,
};
