// Naive in-memory store, good enough for tests and local dev.
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
