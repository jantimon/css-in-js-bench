import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const [,, dir] = process.argv;
const WPD = "node_modules/.pnpm/@jantimon+web-performance-debugger@1.3.0/node_modules/@jantimon/web-performance-debugger/dist/cli.js";
const files = readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".cpu.json"));
const rows = [];
for (const f of files) {
  const lane = f.replace(/\.json$/, "");
  const out = execFileSync("node", [WPD, "query", "cpu", `${dir}/${f}`, "--format", "json"], { encoding: "utf8" });
  const j = JSON.parse(out);
  const pkgs = (j.byPackage || []).map(p => `${p.key} ${p.selfMs.toFixed(1)}(${p.selfPct.toFixed(0)}%)`);
  rows.push({ lane, jsSelfMs: j.jsSelfMs, samples: j.sampleCount, pkgs });
}
rows.sort((a,b)=>a.jsSelfMs-b.jsSelfMs);
console.log("lane".padEnd(26), "jsSelfMs".padStart(9), " samples  top packages (self ms, %)");
for (const r of rows) console.log(r.lane.padEnd(26), r.jsSelfMs.toFixed(1).padStart(9), String(r.samples).padStart(7), " ", r.pkgs.slice(0,5).join(" · "));
