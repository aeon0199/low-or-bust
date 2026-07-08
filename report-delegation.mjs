// Builds report-delegation.html from delegation results. Self-contained, zero deps.
import { packages, CONDITIONS } from "./packages.mjs";

// Validated categorical palette (fixed slot order), light/dark selected pairs.
const CAT_LIGHT = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7"];
const CAT_DARK = ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmtK = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);

function aggregate(results) {
  const agg = {};
  for (const pkg of packages) {
    agg[pkg.id] = {};
    for (const cond of CONDITIONS) {
      const rs = results.filter((r) => r.package === pkg.id && r.condition === cond.id);
      if (!rs.length) continue;
      agg[pkg.id][cond.id] = {
        score: mean(rs.map((r) => r.score)),
        tokens: mean(rs.map((r) => r.tokens)),
        durationS: mean(rs.map((r) => r.durationMs / 1000)),
        n: rs.length,
      };
    }
  }
  return agg;
}

function verdict(aggPkg) {
  const ids = CONDITIONS.map((c) => c.id).filter((id) => aggPkg[id]);
  if (!ids.length) return null;
  const best = Math.max(...ids.map((id) => aggPkg[id].score));
  const good = ids.filter((id) => aggPkg[id].score >= best * 0.95);
  const sweet = good.sort((a, b) => aggPkg[a].tokens - aggPkg[b].tokens)[0];
  return { sweet, best, sweetScore: aggPkg[sweet].score, sweetTokens: aggPkg[sweet].tokens };
}

function barChart({ agg, metric, yMax, yFmt }) {
  const W = 720, H = 300, padL = 46, padR = 8, padT = 14, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const groupW = plotW / packages.length;
  const barW = Math.min(34, (groupW - 30) / CONDITIONS.length - 3);
  const y = (v) => padT + plotH - (v / yMax) * plotH;
  let grid = "", labels = "", marks = "";
  for (let g = 0; g <= 4; g++) {
    const v = (yMax / 4) * g;
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
    labels += `<text x="${padL - 6}" y="${y(v) + 4}" class="tick" text-anchor="end">${yFmt(v)}</text>`;
  }
  packages.forEach((pkg, pi) => {
    const gx = padL + pi * groupW + (groupW - CONDITIONS.length * (barW + 3)) / 2;
    labels += `<text x="${padL + pi * groupW + groupW / 2}" y="${H - 8}" class="axis-label" text-anchor="middle">Package ${pkg.id}: ${pkg.label}</text>`;
    CONDITIONS.forEach((cond, ci) => {
      const d = agg[pkg.id][cond.id];
      if (!d) return;
      const v = d[metric];
      const x = gx + ci * (barW + 3);
      const top = y(v), h = Math.max(2, padT + plotH - top);
      const tip = `${cond.label} — ${metric === "score" ? Math.round(v) + "/100" : fmtK(v) + " tokens"} (n=${d.n})`;
      marks += `<path d="M${x},${top + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} h${-barW} z" class="s${ci} mark" data-tip="${esc(tip)}"/>`;
    });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" class="baseline"/>${marks}${labels}</svg>`;
}

function scatterPanel(pkg, aggPkg) {
  const W = 460, H = 280, padL = 42, padR = 20, padT = 16, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const ids = CONDITIONS.map((c) => c.id).filter((id) => aggPkg[id]);
  if (!ids.length) return `<div class="panel"><h3>Package ${pkg.id}</h3><p class="muted">no data</p></div>`;
  const maxTok = Math.max(...ids.map((id) => aggPkg[id].tokens)) * 1.15 || 1;
  const x = (t) => padL + (t / maxTok) * plotW;
  const y = (s) => padT + plotH - (s / 100) * plotH;
  let grid = "", ticks = "";
  for (let g = 0; g <= 2; g++) {
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(50 * g)}" y2="${y(50 * g)}" class="grid"/>`;
    ticks += `<text x="${padL - 6}" y="${y(50 * g) + 4}" class="tick" text-anchor="end">${50 * g}</text>`;
  }
  ticks += `<text x="${W - padR}" y="${H - 8}" class="tick" text-anchor="end">${fmtK(maxTok)} tokens</text>`;
  const dots = ids
    .map((id) => {
      const ci = CONDITIONS.findIndex((c) => c.id === id);
      const d = aggPkg[id];
      const tip = `${CONDITIONS[ci].label} — ${Math.round(d.score)}/100 · ${fmtK(d.tokens)} tokens · ${Math.round(d.durationS)}s`;
      return `<circle cx="${x(d.tokens)}" cy="${y(d.score)}" r="6" class="s${ci} mark ring" data-tip="${esc(tip)}"/><text x="${x(d.tokens) + 9}" y="${y(d.score) - 8}" class="direct-label">${id}</text>`;
    })
    .join("");
  return `<div class="panel"><h3>Package ${pkg.id}: ${pkg.label}</h3><svg viewBox="0 0 ${W} ${H}" role="img">${grid}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" class="baseline"/>${dots}${ticks}</svg></div>`;
}

export function buildDelegationReport(results) {
  const agg = aggregate(results);
  const models = [...new Set(results.map((r) => r.model))].join(", ");

  const cards = packages
    .map((pkg) => {
      const v = verdict(agg[pkg.id]);
      if (!v) return `<div class="card"><div class="card-cat">Package ${pkg.id}</div><div class="muted">no data yet</div></div>`;
      const cond = CONDITIONS.find((c) => c.id === v.sweet);
      return `<div class="card"><div class="card-cat">Package ${pkg.id}: ${pkg.label}</div><div class="hero">${cond.label}</div><div class="card-sub">${Math.round(v.sweetScore)}/100 at ${fmtK(v.sweetTokens)} mean tokens — cheapest within 5% of the best condition</div></div>`;
    })
    .join("");

  const legend = CONDITIONS.map((c, i) => `<span class="legend-item"><span class="swatch s${i}"></span>${c.label}</span>`).join("");
  const maxTokAll = Math.max(1, ...packages.flatMap((p) => CONDITIONS.map((c) => agg[p.id][c.id]?.tokens ?? 0)));
  const yMaxTok = Math.ceil((maxTokAll * 1.15) / 1000) * 1000;

  const rows = results
    .slice()
    .sort((a, b) => a.package.localeCompare(b.package) || CONDITIONS.findIndex((c) => c.id === a.condition) - CONDITIONS.findIndex((c) => c.id === b.condition) || a.trial - b.trial)
    .map((r) => {
      const failing = (r.gradeSteps ?? []).filter((s) => s.pass < s.total).map((s) => `${s.step} ${s.pass}/${s.total}`).join("; ");
      return `<tr><td>${r.package}</td><td>${esc(r.condition)}</td><td class="num">${r.trial}</td><td class="num">${r.score}</td><td class="num">${fmtK(r.tokens)}</td><td class="num">${Math.round(r.durationMs / 1000)}s</td><td class="detail">${esc(failing || "all checks passed")}${r.anyCallError ? " · call errors" : ""}</td></tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Low or Bust 2: Delegation</title>
<style>
:root{
  --surface:#fcfcfb; --page:#f9f9f7; --ink:#0b0b0b; --ink-2:#52514e; --muted:#898781;
  --grid:#e1e0d9; --baseline:#c3c2b7; --border:rgba(11,11,11,.10);
  ${CAT_LIGHT.map((c, i) => `--s${i}:${c};`).join(" ")}
}
@media (prefers-color-scheme: dark){:root{
  --surface:#1a1a19; --page:#0d0d0d; --ink:#ffffff; --ink-2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --baseline:#383835; --border:rgba(255,255,255,.10);
  ${CAT_DARK.map((c, i) => `--s${i}:${c};`).join(" ")}
}}
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px;max-width:960px;margin:0 auto}
h1{font-size:26px;margin-bottom:2px} h2{font-size:17px;margin:36px 0 4px} h3{font-size:14px;color:var(--ink-2);margin-bottom:4px}
.sub,.muted{color:var(--muted);font-size:13px}
.chart-note{color:var(--ink-2);font-size:13px;margin-bottom:10px}
section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-top:10px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}
.card{flex:1 1 260px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 18px}
.card-cat{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.hero{font-size:26px;font-weight:700;margin:2px 0}
.card-sub{font-size:13px;color:var(--ink-2)}
svg{width:100%;height:auto;display:block}
.grid{stroke:var(--grid);stroke-width:1}
.baseline{stroke:var(--baseline);stroke-width:1}
.tick{fill:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}
.axis-label{fill:var(--ink-2);font-size:12px}
.direct-label{fill:var(--ink-2);font-size:11px}
${CAT_LIGHT.map((_, i) => `.s${i}{fill:var(--s${i})}`).join(" ")}
.mark{cursor:default}.mark:hover{opacity:.82}
.ring{stroke:var(--surface);stroke-width:2}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 2px;font-size:12px;color:var(--ink-2)}
.legend-item{display:inline-flex;align-items:center;gap:5px}
.swatch{width:10px;height:10px;border-radius:3px;display:inline-block}
${CAT_LIGHT.map((_, i) => `.swatch.s${i}{background:var(--s${i})}`).join(" ")}
.panels{display:flex;gap:14px;flex-wrap:wrap}
.panel{flex:1 1 320px;min-width:300px}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
th{text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--baseline);padding:6px 8px}
td{border-bottom:1px solid var(--grid);padding:5px 8px;vertical-align:top}
td.num{text-align:right;font-variant-numeric:tabular-nums}
td.detail{color:var(--ink-2);font-size:12px;max-width:320px}
.table-wrap{overflow-x:auto}
#tooltip{position:fixed;pointer-events:none;background:var(--ink);color:var(--page);font-size:12px;padding:6px 9px;border-radius:6px;opacity:0;transition:opacity .1s;z-index:10;max-width:320px}
</style></head><body>
<h1>Low or Bust 2: Delegation</h1>
<div class="sub">One long-context agent vs fresh per-step workers · model: ${esc(models)} · ${results.length} cells (agentic runs, graded by hidden tests)</div>

<div class="cards">${cards}</div>

<h2>Correctness by condition</h2>
<div class="chart-note">Mean hidden-test score (0–100). Package A's steps are independent; Package B's steps depend on each other's decisions.</div>
<section><div class="legend">${legend}</div>${barChart({ agg, metric: "score", yMax: 100, yFmt: (v) => `${v}` })}</section>

<h2>Total tokens by condition</h2>
<div class="chart-note">Mean output tokens per cell, summed across every agent call in the arm (5 worker calls vs 1 monolith call).</div>
<section><div class="legend">${legend}</div>${barChart({ agg, metric: "tokens", yMax: yMaxTok, yFmt: fmtK })}</section>

<h2>Quality vs. cost</h2>
<div class="chart-note">Each point is one condition. Up and to the left wins.</div>
<section><div class="panels">${packages.map((p) => scatterPanel(p, agg[p.id])).join("")}</div></section>

<h2>Every cell</h2>
<section class="table-wrap"><table>
<thead><tr><th>pkg</th><th>condition</th><th>trial</th><th>score</th><th>tokens</th><th>time</th><th>failing checks</th></tr></thead>
<tbody>${rows}</tbody>
</table></section>

<div id="tooltip"></div>
<script>
const tip = document.getElementById("tooltip");
document.addEventListener("mousemove", (e) => {
  const m = e.target.closest(".mark");
  if (m && m.dataset.tip) {
    tip.textContent = m.dataset.tip;
    tip.style.opacity = 1;
    tip.style.left = Math.min(e.clientX + 14, innerWidth - 330) + "px";
    tip.style.top = (e.clientY + 14) + "px";
  } else tip.style.opacity = 0;
});
</script>
</body></html>`;
}
