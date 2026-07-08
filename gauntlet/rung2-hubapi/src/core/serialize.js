// Only expose declared fields plus id — never leak internal columns.
export function serialize(record, fields) {
  const out = { id: record.id };
  for (const name of Object.keys(fields)) {
    if (record[name] !== undefined) out[name] = record[name];
  }
  return out;
}
