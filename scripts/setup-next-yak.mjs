// Vendors next-yak from source: shallow-clones github.com/jantimon/next-yak at the
// commit pinned in next-yak.ref into vendor/next-yak, then builds the JS package and
// the SWC wasm plugin fresh. The next-yak lanes under techs/ resolve the library via
// `link:../../vendor/next-yak/packages/next-yak`, so this must run before `pnpm install`.
//
//   node scripts/setup-next-yak.mjs               clone + build (needs Rust + wasm32-wasip1)
//   node scripts/setup-next-yak.mjs --skip-build  clone only (enough for `pnpm report`)
//
// Building requires the Rust toolchain with the wasm target:
//   rustup target add wasm32-wasip1
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "vendor", "next-yak");
// NEXT_YAK_REPO overrides the clone source (e.g. a local checkout while iterating).
const REPO = process.env.NEXT_YAK_REPO || "https://github.com/jantimon/next-yak.git";
// NEXT_YAK_REF overrides next-yak.ref to build a specific commit.
const REF = (process.env.NEXT_YAK_REF || readFileSync(join(ROOT, "next-yak.ref"), "utf8")).trim();
const skipBuild = process.argv.includes("--skip-build");

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const out = (cmd, cwd) => {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // e.g. a half-finished clone with no HEAD — treat as stale
  }
};

// next-yak.ref holds either a full commit SHA (pinned — reproducible, the mode the
// committed result/ numbers use) or a branch/tag name (for performance experiments,
// e.g. `perf-styled-jsx-folding`). A SHA is immutable, so an up-to-date clone is left
// alone; a branch re-fetches its tip on EVERY run — that's the "update" story, there
// is no separate `git pull`. Fetches go into the existing clone so the cargo build
// cache survives switching refs.
const isSha = /^[0-9a-f]{40}$/.test(REF);
const current = existsSync(join(VENDOR, ".git")) ? out("git rev-parse HEAD", VENDOR) : null;
if (isSha && current === REF) {
  console.log(`vendor/next-yak already at ${REF.slice(0, 10)}`);
} else {
  if (!current) {
    rmSync(VENDOR, { recursive: true, force: true }); // clear a half-finished clone
    run(`git init -q "${VENDOR}"`);
  }
  run(`git fetch -q --depth 1 "${REPO}" "${REF}"`, VENDOR);
  run(`git -c advice.detachedHead=false checkout -q --force FETCH_HEAD`, VENDOR);
  const head = out("git rev-parse HEAD", VENDOR);
  console.log(`vendor/next-yak checked out at ${isSha ? REF.slice(0, 10) : `${REF} (${head?.slice(0, 10)})`}`);
}

if (skipBuild) {
  console.log("--skip-build: vendor clone ready (lanes can link, but `pnpm gen:samples` needs a build).");
  process.exit(0);
}

// Build the library fresh: JS (tsdown) + the SWC plugin (cargo → wasm32-wasip1).
// build:yak only — the repo's full build:swc also compiles the playground wasm,
// which the bench never loads.
run("pnpm install", VENDOR);
run("pnpm build", VENDOR);
run("pnpm run --filter=yak-swc build:yak", VENDOR);
console.log("✓ vendor/next-yak built (js + swc wasm)");
