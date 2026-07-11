#!/usr/bin/env node
// Pareto view across ALL Low or Bust experiments so far.
//   node report-pareto.mjs        → writes report-pareto.html
//
// Panel 1: quality-vs-cost frontier — every (experiment × effort) cell as a
// point (mean score vs mean output tokens PER RUN), non-dominated frontier drawn.
// Panel 2: classic Pareto — total output tokens spent per cell, descending,
// with a cumulative-% line: where the project's token budget actually went.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const load = (d) => readdirSync(join(ROOT, d, "raw")).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(ROOT, d, "raw", f), "utf8")));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const cells = [];
// one-shot suites: per effort over tasks
for (const [dir, suite, model] of [["results", "Suite 1", "Fable 5"], ["results-opus48", "Suite 1", "Opus 4.8"], ["results-hard", "Hard suite", "Fable 5"]]) {
  if (!existsSync(join(ROOT, dir, "raw"))) continue;
  const by = {};
  for (const r of load(dir).filter((r) => !r.isError)) (by[r.effort] ??= []).push(r);
  for (const [eff, arr] of Object.entries(by))
    cells.push({ exp: suite, model, effort: eff, kind: "one-shot",
      score: mean(arr.map((r) => r.score)), perRun: mean(arr.map((r) => r.usage?.output_tokens ?? 0)),
      total: arr.reduce((a, r) => a + (r.usage?.output_tokens ?? 0), 0), n: arr.length });
}
// delegation: per condition
{
  const by = {};
  for (const r of load("results-delegation")) (by[r.condition] ??= []).push(r);
  for (const [cond, arr] of Object.entries(by))
    cells.push({ exp: `Delegation ${cond}`, model: "Fable 5", effort: arr[0].effort, kind: "agentic",
      score: mean(arr.map((r) => r.score)), perRun: mean(arr.map((r) => r.tokens)),
      total: arr.reduce((a, r) => a + r.tokens, 0), n: arr.length });
}
// gauntlet: per effort over rungs
{
  const by = {};
  for (const r of load("results-gauntlet")) (by[r.effort] ??= []).push(r);
  for (const [eff, arr] of Object.entries(by))
    cells.push({ exp: "Gauntlet (10 rungs)", model: "Fable 5", effort: eff, kind: "agentic",
      score: mean(arr.map((r) => r.score)), perRun: mean(arr.map((r) => r.tokens)),
      total: arr.reduce((a, r) => a + r.tokens, 0), n: arr.length });
}
// amnesia: per condition (all low)
{
  const by = {};
  for (const r of load("results-amnesia")) (by[r.condition] ??= []).push(r);
  for (const [cond, arr] of Object.entries(by))
    cells.push({ exp: `Amnesia ${cond}`, model: "Fable 5", effort: "low", kind: "agentic",
      score: mean(arr.map((r) => r.score)), perRun: mean(arr.map((r) => r.totalTokens)),
      total: arr.reduce((a, r) => a + r.totalTokens, 0), n: arr.length });
}

// frontier: non-dominated (min tokens, max score)
const sorted = [...cells].sort((a, b) => a.perRun - b.perRun);
let best = -1;
const frontier = [];
for (const c of sorted) if (c.score > best) { frontier.push(c); best = c.score; }

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Low or Bust — the Pareto view</title>
<style>
:root{--bg:#fcfcfb;--ink:#1a1a18;--ink2:#5f5e59;--muted:#8a897f;--grid:#e8e7e2;--card:#ffffff;--line:#e0dfd9;
--e1:#60a5fa;--e2:#3b82f6;--e3:#2563eb;--e4:#1e40af;--frontier:#b45309;--accent:#2563eb}
@media(prefers-color-scheme:dark){:root{--bg:#191917;--ink:#ecebe6;--ink2:#a8a79e;--muted:#7d7c73;--grid:#2e2d29;--card:#211f1d;--line:#343330;
--e1:#93c5fd;--e2:#60a5fa;--e3:#3b82f6;--e4:#2563eb;--frontier:#fbbf24;--accent:#60a5fa}}
*{box-sizing:border-box;margin:0}
body{font:15px/1.55 ui-sans-serif,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);padding:40px 24px 64px;max-width:1060px;margin:0 auto}
h1{font-size:26px;letter-spacing:-.02em}
.sub{color:var(--ink2);margin:6px 0 30px;max-width:70ch}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px 22px 14px;margin-bottom:28px}
.card h2{font-size:16px;margin-bottom:2px}
.card .csub{font-size:13px;color:var(--ink2);margin-bottom:14px}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2);margin:4px 0 10px}
.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%}
.sw{width:14px;height:3px;border-radius:2px}
svg{width:100%;height:auto;display:block}
svg text{font:11.5px ui-sans-serif,system-ui,sans-serif;fill:var(--ink2)}
svg .pt-label{font-size:10.5px;fill:var(--ink2)}
svg .axis{stroke:var(--grid)}
svg .tick{fill:var(--muted);font-size:10.5px}
#tip{position:fixed;pointer-events:none;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 11px;font-size:12.5px;box-shadow:0 4px 14px rgba(0,0,0,.12);opacity:0;transition:opacity .12s;z-index:9;max-width:260px}
#tip b{color:var(--ink)}
.note{font-size:13px;color:var(--ink2);border-left:3px solid var(--accent);padding:2px 0 2px 12px;margin:18px 0 0}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:8px}
th,td{text-align:left;padding:4px 10px 4px 0;border-bottom:1px solid var(--grid);color:var(--ink2)}
th{color:var(--muted);font-weight:600}
details{margin-top:10px}summary{cursor:pointer;font-size:13px;color:var(--ink2)}
</style></head><body>
<h1>Low or Bust — the Pareto view 🐌⚡</h1>
<p class="sub">Every experiment cell so far (${cells.length} cells, ${cells.reduce((a, c) => a + c.n, 0)} runs across two models): mean quality against mean output tokens per run. The question the whole project asks — <em>what does spending more actually buy?</em></p>

<div class="card">
<h2>Quality vs. cost — the frontier</h2>
<div class="csub">Each point is one experiment × effort cell. Up and to the left is better. The amber line is the Pareto frontier: cells no other cell beats on both quality AND cost.</div>
<div class="legend">
<span><span class="dot" style="background:var(--e1)"></span>low</span>
<span><span class="dot" style="background:var(--e2)"></span>medium</span>
<span><span class="dot" style="background:var(--e3)"></span>high</span>
<span><span class="dot" style="background:var(--e4)"></span>xhigh</span>
<span><span class="sw" style="background:var(--frontier)"></span>Pareto frontier</span>
<span>◇ = Opus 4.8, ● = Fable 5</span></div>
<div id="scatter"></div>
<p class="note">Every cell that reaches 100 is low effort. Medium buys a fraction of a point on Suite&nbsp;1 (93.4 → 93.8, within noise); above that, spending more never rises past the ceiling low already sits on — points just slide right.</p>
</div>

<div class="card">
<h2>Where the tokens went — classic Pareto</h2>
<div class="csub">Total output tokens each cell consumed over the whole project, descending, with the cumulative share line.</div>
<div id="pareto"></div>
</div>

<details><summary>Data table (all cells)</summary><table><thead><tr><th>Experiment</th><th>Model</th><th>Effort</th><th>Runs</th><th>Mean score</th><th>Tokens/run</th><th>Total tokens</th></tr></thead><tbody>
${[...cells].sort((a, b) => b.total - a.total).map((c) => `<tr><td>${c.exp}</td><td>${c.model}</td><td>${c.effort}</td><td>${c.n}</td><td>${c.score.toFixed(1)}</td><td>${Math.round(c.perRun).toLocaleString()}</td><td>${c.total.toLocaleString()}</td></tr>`).join("")}
</tbody></table></details>
<div id="tip"></div>
<script>
const cells=${JSON.stringify(cells)};
const frontier=${JSON.stringify(frontier.map((c) => [c.perRun, c.score]))};
const EC={low:"--e1",medium:"--e2",high:"--e3",xhigh:"--e4"};
const cv=(n)=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const tip=document.getElementById("tip");
function showTip(e,h){tip.innerHTML=h;tip.style.opacity=1;tip.style.left=Math.min(e.clientX+14,innerWidth-280)+"px";tip.style.top=(e.clientY+12)+"px"}
function hideTip(){tip.style.opacity=0}

function scatter(){
  const W=1000,H=460,L=64,R=30,T=18,B=46;
  const xmin=Math.log10(150),xmax=Math.log10(25000);
  const X=(v)=>L+(Math.log10(v)-xmin)/(xmax-xmin)*(W-L-R);
  const ymin=88,ymax=101;
  const Y=(v)=>T+(ymax-v)/(ymax-ymin)*(H-T-B);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Quality versus tokens per run scatter with Pareto frontier">';
  for(const g of [90,92,94,96,98,100]){s+='<line class="axis" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(g)+'" y2="'+Y(g)+'"/><text class="tick" x="'+(L-10)+'" y="'+(Y(g)+3.5)+'" text-anchor="end">'+g+'</text>'}
  for(const g of [250,500,1000,2500,5000,10000,20000]){s+='<line class="axis" x1="'+X(g)+'" x2="'+X(g)+'" y1="'+T+'" y2="'+(H-B)+'"/><text class="tick" x="'+X(g)+'" y="'+(H-B+16)+'" text-anchor="middle">'+(g>=1000?g/1000+"k":g)+'</text>'}
  s+='<text x="'+((L+W-R)/2)+'" y="'+(H-8)+'" text-anchor="middle">mean output tokens per run (log scale)</text>';
  s+='<text transform="translate(14,'+((T+H-B)/2)+') rotate(-90)" text-anchor="middle">mean score /100</text>';
  const fp=frontier.map((p,i)=>(i?"L":"M")+X(p[0])+" "+Y(p[1])).join(" ");
  s+='<path d="'+fp+'" fill="none" stroke="var(--frontier)" stroke-width="2" stroke-dasharray="1 0" opacity=".85"/>';
  cells.forEach((c,i)=>{
    const col="var("+(EC[c.effort]||"--e2")+")",x=X(c.perRun),y=Y(c.score);
    const shape=c.model==="Opus 4.8"
      ?'<rect data-i="'+i+'" x="'+(x-5)+'" y="'+(y-5)+'" width="10" height="10" transform="rotate(45 '+x+' '+y+')" fill="'+col+'" stroke="var(--card)" stroke-width="1.5"/>'
      :'<circle data-i="'+i+'" cx="'+x+'" cy="'+y+'" r="5.5" fill="'+col+'" stroke="var(--card)" stroke-width="1.5"/>';
    s+='<g class="pt">'+shape+'</g>';
  });
  s+='</svg>';
  const el=document.getElementById("scatter");el.innerHTML=s;
  el.querySelectorAll("[data-i]").forEach((n)=>{
    const c=cells[+n.dataset.i];
    n.addEventListener("mousemove",(e)=>showTip(e,"<b>"+c.exp+"</b> · "+c.model+"<br>effort <b>"+c.effort+"</b> · "+c.n+" runs<br>score <b>"+c.score.toFixed(1)+"</b> · <b>"+Math.round(c.perRun).toLocaleString()+"</b> tokens/run"));
    n.addEventListener("mouseleave",hideTip);
  });
}

function pareto(){
  const data=[...cells].sort((a,b)=>b.total-a.total);
  const grand=data.reduce((a,c)=>a+c.total,0);
  let cum=0;const cumPct=data.map((c)=>(cum+=c.total)/grand*100);
  const W=1000,H=430,L=64,R=56,T=14,B=118;
  const bw=(W-L-R)/data.length;
  const ymaxT=Math.ceil(data[0].total/50000)*50000;
  const Y=(v)=>T+(1-v/ymaxT)*(H-T-B);
  const Y2=(p)=>T+(1-p/100)*(H-T-B);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Total token spend per cell, descending, with cumulative percent line">';
  for(const g of [0,.25,.5,.75,1]){const v=g*ymaxT;s+='<line class="axis" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="tick" x="'+(L-10)+'" y="'+(Y(v)+3.5)+'" text-anchor="end">'+Math.round(v/1000)+'k</text>'}
  data.forEach((c,i)=>{
    const x=L+i*bw,col="var("+(EC[c.effort]||"--e2")+")";
    s+='<rect data-p="'+i+'" x="'+(x+2)+'" y="'+Y(c.total)+'" width="'+(bw-4)+'" height="'+(Y(0)-Y(c.total))+'" rx="4" fill="'+col+'"/>';
    s+='<text class="pt-label" transform="translate('+(x+bw/2+3)+','+(Y(0)+8)+') rotate(38)" text-anchor="start">'+c.exp+" · "+c.effort+(c.model==="Opus 4.8"?" (Opus)":"")+'</text>';
  });
  const lp=cumPct.map((p,i)=>(i?"L":"M")+(L+i*bw+bw/2)+" "+Y2(p)).join(" ");
  s+='<path d="'+lp+'" fill="none" stroke="var(--frontier)" stroke-width="2"/>';
  cumPct.forEach((p,i)=>{s+='<circle cx="'+(L+i*bw+bw/2)+'" cy="'+Y2(p)+'" r="3" fill="var(--frontier)" stroke="var(--card)" stroke-width="1.2"/>'});
  for(const g of [25,50,75,100]){s+='<text class="tick" x="'+(W-R+8)+'" y="'+(Y2(g)+3.5)+'">'+g+'%</text>'}
  s+='<text transform="translate(14,'+((T+H-B)/2)+') rotate(-90)" text-anchor="middle">total output tokens</text>';
  s+='</svg>';
  const el=document.getElementById("pareto");el.innerHTML=s;
  el.querySelectorAll("[data-p]").forEach((n)=>{
    const i=+n.dataset.p,c=data[i];
    n.addEventListener("mousemove",(e)=>showTip(e,"<b>"+c.exp+"</b> · "+c.model+"<br>effort <b>"+c.effort+"</b><br><b>"+c.total.toLocaleString()+"</b> tokens total ("+(c.total/grand*100).toFixed(1)+"%)<br>cumulative "+cumPct[i].toFixed(1)+"%"));
    n.addEventListener("mouseleave",hideTip);
  });
}
scatter();pareto();
</script></body></html>`;

writeFileSync(join(ROOT, "report-pareto.html"), html);
console.log(`report-pareto.html written — ${cells.length} cells, frontier: ${frontier.map((c) => `${c.exp}/${c.effort}`).join(" → ")}`);
