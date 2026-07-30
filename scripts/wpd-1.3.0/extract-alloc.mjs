// Rank a --target node --alloc sweep by total allocated bytes, per lane, with the
// by-package split. Reads `wpd query alloc --format json` for each recording.
// Usage: node scripts/wpd-1.3.0/extract-alloc.mjs .wpd-runs/alloc/<case>
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [, , dir] = process.argv;
const WPD =
  "node_modules/.pnpm/@jantimon+web-performance-debugger@1.3.0/node_modules/@jantimon/web-performance-debugger/dist/cli.js";
const mb = (bytes) => (bytes / 1048576).toFixed(1) + "MB";

// A --alloc record writes <lane>.json (recording) plus <lane>.alloc.json (the model
// sibling); read only the recording so a lane is not counted twice.
const files = readdirSync(dir).filter(
  (name) => name.endsWith(".json") && !name.endsWith(".cpu.json") && !name.endsWith(".alloc.json"),
);
const rows = [];
for (const file of files) {
  const lane = file.replace(/\.json$/, "");
  const model = JSON.parse(
    execFileSync("node", [WPD, "query", "alloc", `${dir}/${file}`, "--format", "json"], { encoding: "utf8" }),
  );
  const packages = (model.byPackage || []).map(
    (pkg) => `${pkg.key} ${mb(pkg.selfBytes)}(${pkg.selfPct.toFixed(0)}%)`,
  );
  rows.push({ lane, total: model.totalBytes, packages });
}
rows.sort((left, right) => left.total - right.total);
console.log("lane".padEnd(22), "totalAlloc".padStart(11), "  top packages (share)");
for (const row of rows) {
  console.log(row.lane.padEnd(22), mb(row.total).padStart(11), "  ", row.packages.slice(0, 4).join(" · "));
}
