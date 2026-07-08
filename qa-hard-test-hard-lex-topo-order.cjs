const { buildOrder } = require("./qa-hard-mod-hard-lex-topo-order.cjs");
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

check(() => buildOrder(3, []), [0,1,2]);
check(() => buildOrder(4, [[3,0],[3,1],[0,2]]), [3,0,1,2]);          // must delay 0,1,2 behind 3, then go smallest-first
check(() => buildOrder(5, [[4,0],[1,0]]), [1,2,3,4,0]);
check(() => buildOrder(2, [[0,1],[1,0]]), null);                      // cycle
check(() => buildOrder(1, [[0,0]]), null);                            // self-cycle
check(() => buildOrder(4, [[1,0],[2,0],[3,0]]), [1,2,3,0]);
check(() => buildOrder(6, [[5,2],[5,0],[4,0],[4,1],[2,3],[3,1]]), [4,5,0,2,3,1]);   // brute-force verified
check(() => buildOrder(3, [[0,1],[0,1]]), [0,1,2]);                   // duplicate edges

console.log(JSON.stringify({ pass, total }));
