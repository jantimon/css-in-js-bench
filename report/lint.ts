// Per-package schema validator (§11). NOT a cross-file sync police — it validates
// each tech folder locally and checks each implemented case has a definition. Missing
// cells are intentional by construction, so there is no "expected matrix" check. Build-
// time errors (a bad vite config) are left for gen to surface loudly.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TECHS_DIR = join(ROOT, "techs");
const CASES_DIR = join(ROOT, "cases");

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const BUILD_PLUGINS = new Set([null, "yak", "stylex"]);
const APP_STYLESHEETS = new Set([null, "tailwind", "panda", "stylex", "bamboo"]);
const CSS_KINDS = new Set(["extracted", "atomic", "utility", "runtime", "none"]);
const FRAMEWORKS = new Set([undefined, "solid"]); // absent = react, this suite's default

const problems: string[] = [];
const fail = (m: string) => problems.push(m);

const caseIds = new Set(
  readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, "")),
);

for (const tech of readdirSync(TECHS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const dir = join(TECHS_DIR, tech);
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    fail(`${tech}: no package.json`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  // identity = dirname
  if (pkg.name !== tech) fail(`${tech}: package.json name "${pkg.name}" !== dirname "${tech}"`);
  if (!pkg.description) fail(`${tech}: missing description (the chart label)`);

  // bench block
  const b = pkg.bench;
  if (!b || typeof b !== "object") fail(`${tech}: missing bench block`);
  else {
    if (!HEX.test(b.color ?? "")) fail(`${tech}: bench.color "${b.color}" is not a hex colour`);
    if (!BUILD_PLUGINS.has(b.buildPlugin ?? null)) fail(`${tech}: bench.buildPlugin "${b.buildPlugin}" invalid`);
    if (!APP_STYLESHEETS.has(b.appStylesheet ?? null)) fail(`${tech}: bench.appStylesheet "${b.appStylesheet}" invalid`);
    if (!CSS_KINDS.has(b.cssKind)) fail(`${tech}: bench.cssKind "${b.cssKind}" invalid`);
    if (!FRAMEWORKS.has(b.framework)) fail(`${tech}: bench.framework "${b.framework}" invalid`);
  }

  // each implemented case must have an index.tsx that default-exports + a matching
  // cases/<id>.ts. Checked statically (a raw import of a plugin-dependent index — e.g.
  // stylex.create — would throw at lint time), so we assert the `export default` token.
  const caseDir = join(dir, "case");
  for (const id of existsSync(caseDir) ? readdirSync(caseDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []) {
    const entry = join(caseDir, id, "index.tsx");
    if (!existsSync(entry)) fail(`${tech}/${id}: no index.tsx`);
    else if (!/export\s+default\b/.test(readFileSync(entry, "utf8"))) fail(`${tech}/${id}: index.tsx has no default export`);
    if (!caseIds.has(id)) fail(`${tech}/${id}: no matching cases/${id}.ts`);
  }
}

if (problems.length) {
  console.error(`\n✗ lint: ${problems.length} problem(s)\n` + problems.map((p) => `  • ${p}`).join("\n") + "\n");
  process.exit(1);
}
console.log(`✓ lint: ${caseIds.size} case(s), ${readdirSync(TECHS_DIR).length} tech folder(s) — all package schemas valid.`);
