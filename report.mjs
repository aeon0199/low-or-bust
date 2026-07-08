// Builds report.html from scored results. Zero dependencies, fully self-contained.
import { EFFORTS, tasks } from "./tasks.mjs";

// Validated ordinal blue ramp (one hue, light→dark = low→max effort).
const RAMP_LIGHT = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
const RAMP_DARK = ["#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];
const CATEGORIES = ["coding", "reasoning", "writing"];
const CAT_LABEL = { coding: "Coding", reasoning: "Reasoning", writing: "Writing" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmtK = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);

function aggregate(results) {
  // per (category, effort): mean score, mean output tokens, mean duration
  const agg = {};
  for (const cat of CATEGORIES) {
    agg[cat] = {};
    for (const effort of EFFORTS) {
      const rs = results.filter((r) => r.category === cat && r.effort === effort && r.score !== null);
      if (!rs.length) continue;
      agg[cat][effort] = {
        score: mean(rs.map((r) => r.score)),
        tokens: mean(rs.map((r) => r.usage?.output_tokens ?? 0)),
        durationS: mean(rs.map((r) => r.durationMs / 1000)),
        n: rs.length,
      };
    }
  }
  return agg;
}

function verdict(aggCat) {
  const entries = EFFORTS.filter((e) => aggCat[e]);
  if (!entries.length) return null;
  const best = Math.max(...entries.map((e) => aggCat[e].score));
  // cheapest (by tokens) effort achieving >= 95% of the best mean score
  const good = entries.filter((e) => aggCat[e].score >= best * 0.95);
  const sweet = good.sort((a, b) => aggCat[a].tokens - aggCat[b].tokens)[0];
  const maxTok = Math.max(...entries.map((e) => aggCat[e].tokens));
  return { sweet, best, sweetScore: aggCat[sweet].score, savings: 1 - aggCat[sweet].tokens / maxTok, entries };
}

// ------------------------------------------------------------------- SVG bits
function groupedBars({ agg, metric, yMax, yFmt, id }) {
  // groups = categories, series = efforts (ordinal ramp)
  const W = 720, H = 300, padL = 44, padR = 8, padT = 14, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const groupW = plotW / CATEGORIES.length;
  const barW = Math.min(26, (groupW - 24) / EFFORTS.length - 2);
  const y = (v) => padT + plotH - (v / yMax) * plotH;
  let marks = "", gridLines = "", labels = "";
  for (let g = 0; g <= 4; g++) {
    const v = (yMax / 4) * g;
    gridLines += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
    labels += `<text x="${padL - 6}" y="${y(v) + 4}" class="tick" text-anchor="end">${yFmt(v)}</text>`;
  }
  CATEGORIES.forEach((cat, ci) => {
    const gx = padL + ci * groupW + (groupW - EFFORTS.length * (barW + 2)) / 2;
    labels += `<text x="${padL + ci * groupW + groupW / 2}" y="${H - 8}" class="axis-label" text-anchor="middle">${CAT_LABEL[cat]}</text>`;
    EFFORTS.forEach((effort, ei) => {
      const d = agg[cat][effort];
      if (!d) return;
      const v = d[metric];
      const x = gx + ei * (barW + 2);
      const top = y(v), h = Math.max(2, padT + plotH - top);
      const tip = `${CAT_LABEL[cat]} · ${effort} — ${metric === "score" ? Math.round(v) + "/100" : fmtK(v) + " tokens"} (n=${d.n})`;
      marks += `<path d="M${x},${top + 4} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} h${-barW} z" class="s${ei} mark" data-tip="${esc(tip)}"/>`;
    });
  });
  return `<svg viewBox="0 0 ${W} ${H}" id="${id}" role="img">${gridLines}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" class="baseline"/>${marks}${labels}</svg>`;
}

function qualityCostPanel(cat, aggCat) {
  const W = 340, H = 260, padL = 40, padR = 46, padT = 16, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const entries = EFFORTS.filter((e) => aggCat[e]);
  if (!entries.length) return `<div class="panel"><h3>${CAT_LABEL[cat]}</h3><p class="muted">no data</p></div>`;
  const maxTok = Math.max(...entries.map((e) => aggCat[e].tokens)) * 1.1 || 1;
  const x = (t) => padL + (t / maxTok) * plotW;
  const y = (s) => padT + plotH - (s / 100) * plotH;
  let grid = "", ticks = "";
  for (let g = 0; g <= 2; g++) {
    const v = 50 * g;
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
    ticks += `<text x="${padL - 6}" y="${y(v) + 4}" class="tick" text-anchor="end">${v}</text>`;
  }
  ticks += `<text x="${padL}" y="${H - 8}" class="tick" text-anchor="start">0</text>`;
  ticks += `<text x="${W - padR}" y="${H - 8}" class="tick" text-anchor="end">${fmtK(maxTok)} tokens</text>`;
  const pts = entries.map((e) => ({ e, X: x(aggCat[e].tokens), Y: y(aggCat[e].score), d: aggCat[e] }));
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p.X},${p.Y}`).join("");
  const dots = pts
    .map((p) => {
      const ei = EFFORTS.indexOf(p.e);
      const tip = `${p.e} — ${Math.round(p.d.score)}/100 · ${fmtK(p.d.tokens)} tokens · ${Math.round(p.d.durationS)}s`;
      const lbl = p.e === entries[0] || p.e === entries[entries.length - 1] ? `<text x="${p.X + 8}" y="${p.Y - 8}" class="direct-label">${p.e}</text>` : "";
      return `<circle cx="${p.X}" cy="${p.Y}" r="5" class="s${ei} mark ring" data-tip="${esc(tip)}"/>${lbl}`;
    })
    .join("");
  return `<div class="panel"><h3>${CAT_LABEL[cat]}</h3><svg viewBox="0 0 ${W} ${H}" role="img">${grid}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" class="baseline"/><path d="${path}" class="connect"/>${dots}${ticks}</svg></div>`;
}

// ----------------------------------------------------------------------- page
export function buildReport(results) {
  const agg = aggregate(results);
  const generated = new Date().toLocaleString();
  const models = [...new Set(results.map((r) => r.model))].join(", ");

  const cards = CATEGORIES.map((cat) => {
    const v = verdict(agg[cat]);
    if (!v) return `<div class="card"><div class="card-cat">${CAT_LABEL[cat]}</div><div class="muted">no data yet</div></div>`;
    const pct = Math.round(v.savings * 100);
    return `<div class="card">
      <div class="card-cat">${CAT_LABEL[cat]}</div>
      <div class="hero">${v.sweet}</div>
      <div class="card-sub">${Math.round(v.sweetScore)}/100 — within 5% of the best effort${pct > 0 ? `, using ${pct}% fewer tokens than the most expensive` : ""}</div>
    </div>`;
  }).join("");

  const legend = EFFORTS.map((e, i) => `<span class="legend-item"><span class="swatch s${i}"></span>${e}</span>`).join("");

  const rows = results
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.taskId.localeCompare(b.taskId) || EFFORTS.indexOf(a.effort) - EFFORTS.indexOf(b.effort))
    .map(
      (r) => `<tr><td>${esc(r.taskId)}</td><td>${r.category}</td><td>${r.effort}</td><td class="num">${r.score ?? "—"}</td><td class="num">${fmtK(r.usage?.output_tokens ?? 0)}</td><td class="num">${Math.round(r.durationMs / 1000)}s</td><td class="detail">${esc((r.scoreDetail ?? "").slice(0, 160))}</td></tr>`
    )
    .join("");

  const scoreChart = groupedBars({ agg, metric: "score", yMax: 100, yFmt: (v) => `${v}`, id: "score-chart" });
  const maxTokAll = Math.max(1, ...CATEGORIES.flatMap((c) => EFFORTS.map((e) => agg[c][e]?.tokens ?? 0)));
  const yMaxTok = Math.ceil((maxTokAll * 1.15) / 500) * 500;
  const tokenChart = groupedBars({ agg, metric: "tokens", yMax: yMaxTok, yFmt: fmtK, id: "token-chart" });
  const panels = CATEGORIES.map((c) => qualityCostPanel(c, agg[c])).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Low or Bust — effort level benchmark</title>
<style>
:root{
  --surface:#fcfcfb; --page:#f9f9f7; --ink:#0b0b0b; --ink-2:#52514e; --muted:#898781;
  --grid:#e1e0d9; --baseline:#c3c2b7; --border:rgba(11,11,11,.10);
  --s0:${RAMP_LIGHT[0]}; --s1:${RAMP_LIGHT[1]}; --s2:${RAMP_LIGHT[2]}; --s3:${RAMP_LIGHT[3]}; --s4:${RAMP_LIGHT[4]};
}
@media (prefers-color-scheme: dark){:root{
  --surface:#1a1a19; --page:#0d0d0d; --ink:#ffffff; --ink-2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --baseline:#383835; --border:rgba(255,255,255,.10);
  --s0:${RAMP_DARK[0]}; --s1:${RAMP_DARK[1]}; --s2:${RAMP_DARK[2]}; --s3:${RAMP_DARK[3]}; --s4:${RAMP_DARK[4]};
}}
*{box-sizing:border-box;margin:0}
body{background:var(--page);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px;max-width:960px;margin:0 auto}
h1{font-size:26px;margin-bottom:2px} h2{font-size:17px;margin:36px 0 4px} h3{font-size:14px;color:var(--ink-2);margin-bottom:4px}
.sub,.muted{color:var(--muted);font-size:13px}
.chart-note{color:var(--ink-2);font-size:13px;margin-bottom:10px}
section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-top:10px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}
.card{flex:1 1 180px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 18px}
.card-cat{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.hero{font-size:34px;font-weight:700;margin:2px 0}
.card-sub{font-size:13px;color:var(--ink-2)}
svg{width:100%;height:auto;display:block}
.grid{stroke:var(--grid);stroke-width:1}
.baseline{stroke:var(--baseline);stroke-width:1}
.tick{fill:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}
.axis-label{fill:var(--ink-2);font-size:12px}
.direct-label{fill:var(--ink-2);font-size:11px}
.s0{fill:var(--s0)} .s1{fill:var(--s1)} .s2{fill:var(--s2)} .s3{fill:var(--s3)} .s4{fill:var(--s4)}
.mark{cursor:default}.mark:hover{opacity:.82}
.ring{stroke:var(--surface);stroke-width:2}
.connect{fill:none;stroke:var(--baseline);stroke-width:2}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 2px;font-size:12px;color:var(--ink-2)}
.legend-item{display:inline-flex;align-items:center;gap:5px}
.swatch{width:10px;height:10px;border-radius:3px;display:inline-block}
.swatch.s0{background:var(--s0)}.swatch.s1{background:var(--s1)}.swatch.s2{background:var(--s2)}.swatch.s3{background:var(--s3)}.swatch.s4{background:var(--s4)}
.panels{display:flex;gap:14px;flex-wrap:wrap}
.panel{flex:1 1 260px;min-width:240px}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
th{text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--baseline);padding:6px 8px}
td{border-bottom:1px solid var(--grid);padding:5px 8px;vertical-align:top}
td.num{text-align:right;font-variant-numeric:tabular-nums}
td.detail{color:var(--ink-2);font-size:12px;max-width:340px}
.table-wrap{overflow-x:auto}
#tooltip{position:fixed;pointer-events:none;background:var(--ink);color:var(--page);font-size:12px;padding:6px 9px;border-radius:6px;opacity:0;transition:opacity .1s;z-index:10;max-width:320px}
</style></head><body>
<h1>Low or Bust</h1>
<div class="sub">Effort-level benchmark · model: ${esc(models)} · generated ${esc(generated)} · ${results.length} scored runs</div>

<div class="cards">${cards}</div>
<div class="sub" style="margin-top:6px">Each card shows the <b>cheapest effort level whose mean score lands within 5% of the best</b> for that category.</div>

<h2>Quality by effort level</h2>
<div class="chart-note">Mean score (0–100) per category. Coding is scored by tests passed, reasoning by exact answer, writing by a blind judge.</div>
<section><div class="legend">${legend}</div>${scoreChart}</section>

<h2>What each effort level costs</h2>
<div class="chart-note">Mean output tokens per run (includes thinking tokens) — this is what eats your usage.</div>
<section><div class="legend">${legend}</div>${tokenChart}</section>

<h2>Quality vs. cost — where the curve flattens</h2>
<div class="chart-note">Each point is one effort level (light → dark = low → max). When the line goes flat, extra tokens stopped buying quality.</div>
<section><div class="panels">${panels}</div></section>

<h2>Every run</h2>
<section class="table-wrap"><table>
<thead><tr><th>task</th><th>category</th><th>effort</th><th>score</th><th>out tokens</th><th>time</th><th>detail</th></tr></thead>
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
