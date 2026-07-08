function parseCSVLine(line) {
  if (typeof line !== "string") return null;
  const fields = [];
  let i = 0;
  while (true) {
    let field = "";
    if (line[i] === '"') {
      i++;
      let closed = false;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; closed = true; break; }
        } else { field += line[i++]; }
      }
      if (!closed) return null;
      if (i < line.length && line[i] !== ",") return null;
    } else {
      while (i < line.length && line[i] !== ",") {
        if (line[i] === '"') return null;
        field += line[i++];
      }
    }
    fields.push(field);
    if (i >= line.length) break;
    i++; // skip comma
    if (i === line.length) { fields.push(""); break; }
  }
  return fields;
}
module.exports = { parseCSVLine };
