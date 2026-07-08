// Shared validation. Contract: ALWAYS returns { ok: boolean, errors: array, value: object }.
// `errors` is an empty array when ok — callers must branch on `ok`, never on `errors`.
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
      if (!optional) errors.push(`${name} is required`);
      continue;
    }
    if (typeof given !== type) {
      errors.push(`${name} must be a ${type}`);
      continue;
    }
    if (type === "string" && !given.trim()) {
      errors.push(`${name} must not be blank`);
      continue;
    }
    value[name] = given;
  }
  for (const key of Object.keys(payload)) {
    if (!(key in fields)) errors.push(`unknown field ${key}`);
  }
  return { ok: errors.length === 0, errors, value };
}
