// Generates the "hubapi" fixture twice:
//   rung2-hubapi — payments module violates the core validate() contract (the planted bug)
//   rung4-hubapi — clean, plus src/clock.js (used by the rate-limiting rung)
// Run once at build time: node gauntlet/gen-hubapi.mjs
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const RESOURCES = [
  { name: "users", fields: [["email", "string"], ["displayName", "string"], ["age", "number?"]] },
  { name: "orders", fields: [["userId", "string"], ["totalCents", "number"], ["status", "string"]] },
  { name: "products", fields: [["sku", "string"], ["title", "string"], ["priceCents", "number"]] },
  { name: "payments", fields: [["orderId", "string"], ["amountCents", "number"], ["method", "string"]] },
  { name: "refunds", fields: [["paymentId", "string"], ["amountCents", "number"], ["reason", "string?"]] },
  { name: "carts", fields: [["userId", "string"], ["itemCount", "number"]] },
  { name: "coupons", fields: [["code", "string"], ["percentOff", "number"]] },
  { name: "reviews", fields: [["productId", "string"], ["rating", "number"], ["body", "string?"]] },
  { name: "addresses", fields: [["userId", "string"], ["line1", "string"], ["city", "string"], ["zip", "string"]] },
  { name: "shipments", fields: [["orderId", "string"], ["carrier", "string"], ["tracking", "string?"]] },
  { name: "invoices", fields: [["orderId", "string"], ["dueDate", "string"], ["amountCents", "number"]] },
  { name: "categories", fields: [["slug", "string"], ["title", "string"]] },
  { name: "wishlists", fields: [["userId", "string"], ["productId", "string"]] },
  { name: "notifications", fields: [["userId", "string"], ["kind", "string"], ["body", "string"]] },
  { name: "sessions", fields: [["userId", "string"], ["userAgent", "string?"]] },
  { name: "webhooks", fields: [["url", "string"], ["event", "string"]] },
  { name: "apikeys", fields: [["label", "string"], ["scopes", "string"]] },
  { name: "audits", fields: [["actor", "string"], ["action", "string"], ["target", "string?"]] },
  { name: "inventory", fields: [["sku", "string"], ["quantity", "number"], ["warehouse", "string"]] },
  { name: "shipping", fields: [["zone", "string"], ["flatCents", "number"]] },
];

const singular = (n) => (n.endsWith("ies") ? n.slice(0, -3) + "y" : n.endsWith("s") ? n.slice(0, -1) : n);

function moduleSource(res, { buggy }) {
  const fieldSpec = res.fields.map(([f, t]) => `    ${f}: "${t}",`).join("\n");
  // The planted bug: `result.errors` is ALWAYS an array (truthy even when empty),
  // so this module rejects every payload. Every other module checks `!result.ok`.
  const validCheck = buggy
    ? `  if (result.errors) {\n    return failure("validation_failed", result.errors);\n  }`
    : `  if (!result.ok) {\n    return failure("validation_failed", result.errors);\n  }`;
  const todo = res.name === "shipping" ? "\n// TODO: zone-based rate lookup once the pricing service lands." : "";
  const herring = res.name === "inventory"
    ? `\n// NOTE: slice(0, limit) below looks like it drops the last item — it doesn't;\n// limit is already clamped to list.length by the caller contract.`
    : "";
  return `import { validate } from "../core/validate.js";
import { success, failure } from "../core/errors.js";
import { store } from "../core/store.js";
import { serialize } from "../core/serialize.js";
${todo}
const FIELDS = {
${fieldSpec}
};

const COLLECTION = "${res.name}";

export function create(req) {
  const result = validate(req.payload, FIELDS);
${validCheck}
  const record = store.insert(COLLECTION, { ...result.value, createdBy: req.user });
  return success(serialize(record, FIELDS));
}

export function get(req) {
  const record = store.get(COLLECTION, req.id);
  if (!record) return failure("not_found");
  return success(serialize(record, FIELDS));
}
${herring}
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

export const ${singular(res.name)}Routes = {
  "${res.name}.create": create,
  "${res.name}.get": get,
  "${res.name}.list": list,
  "${res.name}.remove": remove,
};
`;
}

const CORE = {
  "core/validate.js": `// Shared validation. Contract: ALWAYS returns { ok: boolean, errors: array, value: object }.
// \`errors\` is an empty array when ok — callers must branch on \`ok\`, never on \`errors\`.
export function validate(payload, fields) {
  const errors = [];
  const value = {};
  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["payload must be an object"], value };
  }
  for (const [name, spec] of Object.entries(fields)) {
    const optional = spec.endsWith("?");
    const type = optional ? spec.slice(0, -1) : spec;
    const given = payload[name];
    if (given === undefined || given === null) {
      if (!optional) errors.push(\`\${name} is required\`);
      continue;
    }
    if (typeof given !== type) {
      errors.push(\`\${name} must be a \${type}\`);
      continue;
    }
    if (type === "string" && !given.trim()) {
      errors.push(\`\${name} must not be blank\`);
      continue;
    }
    value[name] = given;
  }
  for (const key of Object.keys(payload)) {
    if (!(key in fields)) errors.push(\`unknown field \${key}\`);
  }
  return { ok: errors.length === 0, errors, value };
}
`,
  "core/errors.js": `export function success(data) {
  return { ok: true, data };
}

export function failure(error, detail = []) {
  return { ok: false, error, detail };
}
`,
  "core/store.js": `// Naive in-memory store, good enough for tests and local dev.
const collections = new Map();
let nextId = 1;

function table(name) {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
}

export const store = {
  insert(collection, record) {
    const withId = { id: String(nextId++), ...record };
    table(collection).set(withId.id, withId);
    return withId;
  },
  get(collection, id) {
    return table(collection).get(id) ?? null;
  },
  list(collection) {
    return [...table(collection).values()];
  },
  remove(collection, id) {
    return table(collection).delete(id);
  },
  reset() {
    collections.clear();
    nextId = 1;
  },
};
`,
  "core/serialize.js": `// Only expose declared fields plus id — never leak internal columns.
export function serialize(record, fields) {
  const out = { id: record.id };
  for (const name of Object.keys(fields)) {
    if (record[name] !== undefined) out[name] = record[name];
  }
  return out;
}
`,
};

function routerSource() {
  const imports = RESOURCES.map((r) => `import { ${singular(r.name)}Routes } from "../resources/${r.name}.js";`).join("\n");
  const spreads = RESOURCES.map((r) => `  ...${singular(r.name)}Routes,`).join("\n");
  return `${imports}
import { failure } from "./errors.js";

const routes = {
${spreads}
};

export function dispatch(action, req = {}) {
  const handler = routes[action];
  if (!handler) return failure("unknown_action");
  if (!req.user) return failure("unauthenticated");
  return handler(req);
}

export function actions() {
  return Object.keys(routes).sort();
}
`;
}

function generate(target, { buggy, withClock }) {
  const root = join(HERE, target);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, "src/core"), { recursive: true });
  mkdirSync(join(root, "src/resources"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "hubapi", version: "0.9.2", type: "module", description: "In-memory resource API: 20 resources behind a common router, validator, and store." }, null, 2) + "\n");
  for (const [file, src] of Object.entries(CORE)) writeFileSync(join(root, "src", file), src);
  writeFileSync(join(root, "src/core/router.js"), routerSource());
  for (const res of RESOURCES) {
    writeFileSync(join(root, "src/resources", `${res.name}.js`), moduleSource(res, { buggy: buggy && res.name === "payments" }));
  }
  if (withClock) {
    writeFileSync(join(root, "src/core/clock.js"), `// Injectable time source so tests can control the clock.
let nowFn = () => Date.now();

export function now() {
  return nowFn();
}

export function _setNow(fn) {
  nowFn = fn;
}

export function _resetClock() {
  nowFn = () => Date.now();
}
`);
  }
  console.log(`generated ${target} (buggy=${buggy}, clock=${withClock})`);
}

generate("rung2-hubapi", { buggy: true, withClock: false });
generate("rung4-hubapi", { buggy: false, withClock: true });
