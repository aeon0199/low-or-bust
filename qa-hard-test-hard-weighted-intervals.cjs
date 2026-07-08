const { weightedIntervalMax } = require("./qa-hard-mod-hard-weighted-intervals.cjs");
let pass = 0, total = 0;
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  return v;
}
function check(fn, expected) {
  total++;
  try { if (JSON.stringify(canon(fn())) === JSON.stringify(canon(expected))) pass++; else console.log("    FAIL got", JSON.stringify(fn()), "exp", JSON.stringify(expected)); } catch (e) { console.log("    THROW", e.message.slice(0, 120)); }
}

check(() => weightedIntervalMax([]), 0);
check(() => weightedIntervalMax([[2,5,7]]), 7);
check(() => weightedIntervalMax([[1,4,5],[3,6,6],[5,8,5]]), 10);            // greedy-by-value picks 6, optimal is 5+5
check(() => weightedIntervalMax([[1,3,4],[3,5,4],[5,7,4]]), 12);            // touching chain all compatible
check(() => weightedIntervalMax([[1,10,10],[1,2,3],[2,3,3],[3,4,3],[4,5,3]]), 12);  // long fat interval loses to chain
check(() => weightedIntervalMax([[1,5,7],[2,3,9]]), 9);                     // nested: inner one wins
check(() => weightedIntervalMax([[1,2,1],[2,3,10],[1,3,5]]), 11);
check(() => weightedIntervalMax([[6,8,2],[1,4,3],[4,6,3],[3,7,7]]), 8);     // 3+3+2 beats 7 or 3+7-overlap

console.log(JSON.stringify({ pass, total }));
