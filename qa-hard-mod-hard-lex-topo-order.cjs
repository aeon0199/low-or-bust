function buildOrder(n, edges) {
  const adj = Array.from({ length: n }, () => new Set());
  const indeg = new Array(n).fill(0);
  for (const [a, b] of edges) {
    if (!adj[a].has(b)) { adj[a].add(b); indeg[b]++; }
  }
  const order = [];
  const avail = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) avail.push(i);
  while (avail.length) {
    avail.sort((a, b) => a - b);
    const next = avail.shift();
    order.push(next);
    for (const m of adj[next]) if (--indeg[m] === 0) avail.push(m);
  }
  return order.length === n ? order : null;
}
module.exports = { buildOrder };
