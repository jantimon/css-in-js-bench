import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const [,, dir] = process.argv;
const WPD = "node_modules/.pnpm/@jantimon+web-performance-debugger@1.3.0/node_modules/@jantimon/web-performance-debugger/dist/cli.js";
const files = readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".cpu.json"));
const rows = [];
for (const f of files) {
  const lane = f.replace(/\.json$/, "");
  const j = JSON.parse(execFileSync("node",[WPD,"query","spans",`${dir}/${f}`,"--format","json"],{encoding:"utf8"}));
  const s = j.spans[0];
  const c = s.counts || {};
  rows.push({ lane, wall:s.wallMs, style:s.slices.style?.ms, layout:s.slices.layout?.ms, js:s.slices.js?.ms,
    styleC: c.style?.count ?? c.styleRecalc?.count, layoutC: c.layout?.count, paintC: c.paint?.count, countsKeys: Object.keys(c) });
}
rows.sort((a,b)=>(a.style+a.layout)-(b.style+b.layout));
if (rows[0]) console.error("counts keys:", rows[0].countsKeys.join(","));
console.log("lane".padEnd(20),"wallMs".padStart(8),"styleMs".padStart(8),"layoutMs".padStart(9),"jsMs".padStart(7),"  styleN  layoutN  paintN");
for(const r of rows) console.log(r.lane.padEnd(20),(r.wall??0).toFixed(1).padStart(8),(r.style??0).toFixed(1).padStart(8),(r.layout??0).toFixed(1).padStart(9),(r.js??0).toFixed(1).padStart(7),"  ",String(r.styleC??"-").padStart(5),String(r.layoutC??"-").padStart(6),String(r.paintC??"-").padStart(6));
