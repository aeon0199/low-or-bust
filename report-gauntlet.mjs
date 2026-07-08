// Builds report-gauntlet.html. Self-contained, zero deps.
import { rungs } from "./rungs.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtK = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);
const passed = (r) => r.score === 100 && !r.callError;

function rungCard(rung, rs) {
  if (!rs.length) return `<div class="card"><div class="card-cat">${esc(rung.title)}</div><div class="muted">not run</div></div>`;
  const lows = rs.filter((r) => r.effort === "low").sort((a, b) => a.trial - b.trial);
  const high = rs.find((r) => r.effort === "high");
  const cleared = lows.some(passed);
  let status, sub;
  if (cleared) {
    const first = lows.find(passed);
    status = `<span class="ok">PASSED @ low</span>`;
    sub = `${fmtK(first.tokens)} tokens · ${Math.round(first.durationMs / 1000)}s · ${first.gradePass}/${first.gradeTotal} hidden checks`;
  } else {
    const wall = high ? (passed(high) ? "EFFORT WALL — high effort fixes it" : "capability wall — high fails too") : "unprobed";
    status = `<span class="bad">CRACKED @ low</span>`;
    sub = `low scores [${lows.map((r) => r.score).join(", ")}]${high ? ` · high ${high.score}` : ""} · ${esc(wall)}`;
  }
  return `<div class="card"><div class="card-cat">${esc(rung.title)}</div><div class="hero-sm">${status}</div><div class="card-sub">${sub}</div><div class="card-axis">axis: ${esc(rung.axis)}</div></div>`;
}

function chainCurve(results) {
  const rec = results.filter((r) => r.rung === "rung3-longchain" && r.effort === "low").sort((a, b) => a.trial - b.trial)[0];
  if (!rec || !rec.gradeSteps?.length) return "";
  const steps = rec.gradeSteps.filter((s) => /^S\d+/.test(s.step));
  const W = 720, H = 220, padL = 44, padR = 8, padT = 14, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const barW = Math.min(40, plotW / steps.length - 6);
  const y = (v) => padT + plotH - v * plotH;
  let marks = "", labels = "";
  labels += `<text x="${padL - 6}" y="${y(1) + 4}" class="tick" text-anchor="end">100%</text><text x="${padL - 6}" y="${y(0) + 4}" class="tick" text-anchor="end">0</text>`;
  steps.forEach((s, i) => {
    const frac = s.pass / s.total;
    const x = padL + i * (plotW / steps.length) + (plotW / steps.length - barW) / 2;
    const top = y(frac), h = Math.max(2, padT + plotH - top);
    marks += `<path d="M${x},${top + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} h${-barW} z" class="${frac === 1 ? "sfull" : "spart"} mark" data-tip="${esc(`${s.step} — ${s.pass}/${s.total}`)}"/>`;
    labels += `<text x="${x + barW / 2}" y="${H - 22}" class="tick" text-anchor="middle">${i + 1}</text>`;
  });
  labels += `<text x="${padL + plotW / 2}" y="${H - 6}" class="axis-label" text-anchor="middle">step number (later steps = fatter context)</text>`;
  return `<h2>The long-chain degradation curve</h2>
<div class="chart-note">Per-step hidden-check pass rate at low effort, first trial. A cliff on the right = context bloat hurting late steps.</div>
<section><svg viewBox="0 0 ${W} ${H}" role="img"><line x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}" class="baseline"/>${marks}${labels}</svg></section>`;
}

export function buildGauntletReport(results) {
  const models = [...new Set(results.map((r) => r.model))].join(", ");
  const cards = rungs.map((rung) => rungCard(rung, results.filter((r) => r.rung === rung.id))).join("");
  const rows = results
    .slice()
    .sort((a, b) => rungs.findIndex((r) => r.id === a.rung) - rungs.findIndex((r) => r.id === b.rung) || a.effort.localeCompare(b.effort) || a.trial - b.trial)
    .map((r) => {
      const failing = (r.gradeSteps ?? []).filter((s) => s.pass < s.total).map((s) => `${s.step} ${s.pass}/${s.total}${s.detail?.length ? ` (${s.detail[0]})` : ""}`).join("; ");
      return `<tr><td>${esc(r.rung)}</td><td>${r.effort}</td><td class="num">${r.trial}</td><td class="num">${r.score}</td><td class="num">${fmtK(r.tokens)}</td><td class="num">${Math.round(r.durationMs / 1000)}s</td><td class="detail">${esc(failing || "all checks passed")}${r.callError ? " · CALL ERROR" : ""}</td></tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Low or Bust: The Gauntlet</title>
<style>
:root{--surface:#fcfcfb;--page:#f9f9f7;--ink:#0b0b0b;--ink-2:#52514e;--muted:#898781;--grid:#e1e0d9;--baseline:#c3c2b7;--border:rgba(11,11,11,.10);--full:#2a78d6;--part:#e34948;--good:#006300;--bad:#d03b3b}
@media (prefers-color-scheme: dark){:root{--surface:#1a1a19;--page:#0d0d0d;--ink:#fff;--ink-2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--baseline:#383835;--border:rgba(255,255,255,.10);--full:#3987e5;--part:#e66767;--good:#0ca30c;--bad:#e66767}}
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px;max-width:960px;margin:0 auto}
h1{font-size:26px;margin-bottom:2px} h2{font-size:17px;margin:36px 0 4px}
.sub,.muted{color:var(--muted);font-size:13px}
.chart-note{color:var(--ink-2);font-size:13px;margin-bottom:10px}
section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-top:10px}
.cards{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px}
.card-cat{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.hero-sm{font-size:20px;font-weight:700;margin:2px 0}
.ok{color:var(--good)} .bad{color:var(--bad)}
.card-sub{font-size:13px;color:var(--ink-2)} .card-axis{font-size:12px;color:var(--muted);margin-top:2px}
svg{width:100%;height:auto;display:block}
.baseline{stroke:var(--baseline);stroke-width:1}
.tick{fill:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}
.axis-label{fill:var(--ink-2);font-size:12px}
.sfull{fill:var(--full)} .spart{fill:var(--part)}
.mark:hover{opacity:.82}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
th{text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--baseline);padding:6px 8px}
td{border-bottom:1px solid var(--grid);padding:5px 8px;vertical-align:top}
td.num{text-align:right;font-variant-numeric:tabular-nums}
td.detail{color:var(--ink-2);font-size:12px;max-width:340px}
.table-wrap{overflow-x:auto}
#tooltip{position:fixed;pointer-events:none;background:var(--ink);color:var(--page);font-size:12px;padding:6px 9px;border-radius:6px;opacity:0;transition:opacity .1s;z-index:10}
</style></head><body>
<h1>Low or Bust: The Gauntlet</h1>
<div class="sub">Low effort climbs a difficulty ladder until it cracks · model: ${esc(models)} · ${results.length} runs · red bars/labels mark cracks</div>
<div class="cards">${cards}</div>
${chainCurve(results)}
<h2>Every run</h2>
<section class="table-wrap"><table>
<thead><tr><th>rung</th><th>effort</th><th>trial</th><th>score</th><th>tokens</th><th>time</th><th>failing checks</th></tr></thead>
<tbody>${rows}</tbody>
</table></section>
<div id="tooltip"></div>
<script>
const tip = document.getElementById("tooltip");
document.addEventListener("mousemove", (e) => {
  const m = e.target.closest(".mark");
  if (m && m.dataset.tip) { tip.textContent = m.dataset.tip; tip.style.opacity = 1; tip.style.left = Math.min(e.clientX + 14, innerWidth - 200) + "px"; tip.style.top = (e.clientY + 14) + "px"; }
  else tip.style.opacity = 0;
});
</script>
</body></html>`;
}
