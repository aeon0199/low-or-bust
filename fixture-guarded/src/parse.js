export function parseAddCommand(input) {
  if (typeof input !== "string") return null;
  const m = input.match(/^add\s+(.*)$/);
  if (!m) return null;
  return { title: m[1].trim() };
}
