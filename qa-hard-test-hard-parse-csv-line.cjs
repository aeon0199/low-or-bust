const { parseCSVLine } = require("./qa-hard-mod-hard-parse-csv-line.cjs");
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

check(() => parseCSVLine("a,b,c"), ["a","b","c"]);
check(() => parseCSVLine('a,"b,c",d'), ["a","b,c","d"]);
check(() => parseCSVLine('"he said ""hi""",x'), ['he said "hi"',"x"]);
check(() => parseCSVLine("a,,c"), ["a","","c"]);
check(() => parseCSVLine('""'), [""]);
check(() => parseCSVLine(""), [""]);
check(() => parseCSVLine(",a,"), ["","a",""]);
check(() => parseCSVLine('"",""'), ["",""]);
check(() => parseCSVLine('a,"unterminated'), null);
check(() => parseCSVLine('a,b"c'), null);
check(() => parseCSVLine('"a"b,c'), null);
check(() => parseCSVLine('"a""b""c"'), ['a"b"c']);
check(() => parseCSVLine(42), null);

console.log(JSON.stringify({ pass, total }));
