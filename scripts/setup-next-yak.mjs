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
const REF = readFileSync(join(ROOT, "next-yak.ref"), "utf8").trim();
const skipBuild = process.argv.includes("--skip-build");

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const out = (cmd, cwd) => {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // e.g. a half-finished clone with no HEAD — treat as stale
  }
};

// Clone (or fast-forward an existing clone) to the pinned ref. A shallow fetch of the
// exact SHA keeps this cheap; GitHub serves unadvertised-but-reachable SHAs.
const current = existsSync(join(VENDOR, ".git")) ? out("git rev-parse HEAD", VENDOR) : null;
if (current === REF) {
  console.log(`vendor/next-yak already at ${REF.slice(0, 10)}`);
} else {
  if (current) rmSync(VENDOR, { recursive: true, force: true });
  run(`git init -q "${VENDOR}"`);
  run(`git fetch -q --depth 1 ${REPO} ${REF}`, VENDOR);
  run(`git -c advice.detachedHead=false checkout -q FETCH_HEAD`, VENDOR);
  console.log(`vendor/next-yak checked out at ${REF.slice(0, 10)}`);
}

if (skipBuild) {
  console.log("--skip-build: vendor clone ready (lanes can link, but `pnpm gen` needs a build).");
  process.exit(0);
}

// Build the library fresh: JS (tsdown) + the SWC plugin (cargo → wasm32-wasip1).
run("pnpm install", VENDOR);
run("pnpm build", VENDOR);
run("pnpm build:swc", VENDOR);
console.log("✓ vendor/next-yak built (js + swc wasm)");
