// Builds LOCAL next-yak compiler variants from branches of a next-yak worktree and
// snapshots each as a self-contained pair under vendor/yak-snapshots/<label>/ that the
// bench lanes consume via `file:`. This is the multi-version analogue of setup-next-yak.mjs
// (which vendors ONE ref); here we produce N frozen snapshots to compare compiler branches.
//
//   node scripts/pack-yak-snapshots.mjs                build+pack every variant
//   node scripts/pack-yak-snapshots.mjs --only perf    just one label
//   node scripts/pack-yak-snapshots.mjs --skip-build   re-pack from an already-built worktree
//
// WHY pack BOTH next-yak and yak-swc: a next-yak lane needs two things resolvable at build
// time — next-yak (js + vite plugin) AND yak-swc (the Rust→wasm compiler, which next-yak
// finds via `require.resolve("yak-swc/package.json")` whose `main` IS the wasm). A plain
// pack of next-yak still points its `yak-swc` dep at npm, so we pack yak-swc from the SAME
// branch and rewrite next-yak's dep to `file:../yak-swc`. pnpm pack (not cp) is required:
// it resolves the source's `catalog:` refs to concrete versions.
//
// Prereqs (same as setup:yak): Rust toolchain + `rustup target add wasm32-wasip1`.
// NOTE: builds happen IN the worktree, checked out DETACHED at each ref (so a branch already
// checked out in another worktree — e.g. `perf` in worktree-1 — doesn't clash). The original
// checkout is restored even on failure. The shared packages/yak-swc/target survives checkouts, so
// the cargo cache is reused across branches automatically (do NOT redirect CARGO_TARGET_DIR —
// yak-swc's `main` points at that in-package path and pnpm pack must find the wasm there).
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP_DIR = join(ROOT, "vendor", "yak-snapshots");
// The next-yak monorepo worktree to build from. It is deliberately explicit: snapshots are
// a local experiment and should never silently build some unrelated checkout.
const WORKTREE = process.env.NEXT_YAK_WORKTREE;
if (!WORKTREE) throw new Error("NEXT_YAK_WORKTREE must point at a clean next-yak worktree");

// label → immutable commit built into vendor/yak-snapshots/<label>/. The combined commit is
// the tested local merge of the two preceding pins; keeping SHAs here makes result regeneration
// independent of subsequent movement on the source branches.
const VARIANTS = [
  { label: "perf", ref: "59ef95e7c679be57eb728d9ef226119513687ca7" },
  { label: "folding", ref: "df1f11237c3c43e57d04518b47f45a8d5cb38bf6" },
  { label: "perf-folding", ref: "84774f9b6a797e797065e5f80b8e140d4ce6df5d" },
];

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const out = (cmd, cwd) => execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const maybeOut = (cmd, cwd) => {
  try { return out(cmd, cwd); } catch { return null; }
};

const NEXT_YAK_PKG = join(WORKTREE, "packages", "next-yak");
const YAK_SWC_PKG = join(WORKTREE, "packages", "yak-swc");
const WASM_REL = "target/wasm32-wasip1/release/yak_swc.wasm";

if (!existsSync(join(WORKTREE, ".git"))) throw new Error(`worktree not found: ${WORKTREE} (set NEXT_YAK_WORKTREE)`);
const initialRef = maybeOut("git symbolic-ref --quiet --short HEAD", WORKTREE) || out("git rev-parse HEAD", WORKTREE);
if (out("git status --porcelain", WORKTREE)) throw new Error(`worktree is dirty: ${WORKTREE}`);

// Extract a `pnpm pack` tarball (single top-level `package/` dir) into destDir, replacing it.
function extractPack(tgz, destDir) {
  const tmp = mkdtempSync(join(tmpdir(), "yak-extract-"));
  run(`tar -xzf "${tgz}" -C "${tmp}"`, ROOT);
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(dirname(destDir), { recursive: true });
  renameSync(join(tmp, "package"), destDir);
  rmSync(tmp, { recursive: true, force: true });
}

// pnpm pack writes <name>-<version>.tgz; find the one it just produced.
function findTgz(dir) {
  const f = readdirSync(dir).find((n) => n.endsWith(".tgz"));
  if (!f) throw new Error(`no .tgz produced in ${dir}`);
  return join(dir, f);
}

try {
  for (const { label, ref } of VARIANTS) {
    if (only && only !== label) continue;
    console.log(`\n=== ${label}  (${ref.slice(0, 12)}) ===`);

    // Detached checkout so a branch checked out elsewhere doesn't clash.
    run(`git checkout -q --detach "${ref}"`, WORKTREE);
    console.log(`  worktree @ ${out("git rev-parse --short HEAD", WORKTREE)}`);

    if (!skipBuild) {
      run("pnpm install", WORKTREE);
      run("pnpm --filter next-yak build", WORKTREE); // tsdown → dist/
      run("pnpm --filter yak-swc build:yak", WORKTREE); // cargo → wasm32-wasip1
    }
    if (!existsSync(join(YAK_SWC_PKG, WASM_REL))) {
      throw new Error(`${label}: wasm missing at ${WASM_REL} — run without --skip-build`);
    }

    // Pack both packages (resolves catalog: refs → concrete versions).
    const packTmp = mkdtempSync(join(tmpdir(), `yak-pack-${label}-`));
    run(`pnpm pack --pack-destination "${packTmp}"`, NEXT_YAK_PKG);
    const nextYakTgz = findTgz(packTmp);
    run(`pnpm pack --pack-destination "${packTmp}"`, YAK_SWC_PKG);
    const yakSwcTgz = readdirSync(packTmp)
      .filter((n) => n.endsWith(".tgz") && n.includes("yak-swc"))
      .map((n) => join(packTmp, n))[0];
    if (!yakSwcTgz) throw new Error(`${label}: yak-swc pack produced no tarball`);

    const dest = join(SNAP_DIR, label);
    extractPack(nextYakTgz, join(dest, "next-yak"));
    extractPack(yakSwcTgz, join(dest, "yak-swc"));
    rmSync(packTmp, { recursive: true, force: true });

    // Guard: the wasm MUST be inside the packed yak-swc (npm always ships the `main` file,
    // even with files:[] — but verify, since a missing wasm fails silently at bench build time).
    if (!existsSync(join(dest, "yak-swc", WASM_REL))) {
      throw new Error(`${label}: packed yak-swc is missing ${WASM_REL} — check its package.json files/main`);
    }

    // Rewire next-yak's yak-swc dep to the sibling snapshot so it resolves the BRANCH wasm,
    // not npm's published yak-swc.
    const pkgPath = join(dest, "next-yak", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies["yak-swc"] = "file:../yak-swc";
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    const wasmSha = out(`shasum -a 256 "${join(dest, "yak-swc", WASM_REL)}"`, ROOT).slice(0, 12);
    console.log(`  ✓ ${label}: next-yak@${pkg.version} + yak-swc wasm (${wasmSha}) → vendor/yak-snapshots/${label}`);
  }
} finally {
  run(`git checkout -q "${initialRef}"`, WORKTREE);
}

console.log("\n✓ snapshots ready. Run `pnpm install` at the repo root to link the lanes.");
