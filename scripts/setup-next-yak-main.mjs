// Conditionally sets up the "latest github main" next-yak lanes.
//
// next-yak uses changesets: feature branches merge onto `main` and the version bumps only
// AT RELEASE. So `main` is either AHEAD of the latest npm release (unreleased changes) or
// EQUAL to it (right after a release). When equal, a github-main lane is byte-identical to
// the npm lane, so building it is pure waste — this script detects that via the release tag
// and SKIPS it, removing any stale `*-main` lanes.
//
//   node scripts/setup-next-yak-main.mjs            tag-check; build + materialise lanes iff main is ahead
//
// When main IS ahead it clones+builds github main into vendor/next-yak (reusing
// setup-next-yak.mjs) and generates two lanes from the npm-lane templates:
//   techs/next-yak-main       (styled)   ← techs/next-yak
//   techs/next-yak-css-main   (css-prop) ← techs/next-yak-css
// both linking `next-yak` to the freshly built vendor. After this: `pnpm install`, then
// `pnpm gen --tech 'next-yak*'` + `pnpm report`. Building needs Rust + wasm32-wasip1 (see setup:yak).
import { execSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TECHS = join(ROOT, "techs");
const REPO = process.env.NEXT_YAK_REPO || "https://github.com/jantimon/next-yak.git";
const out = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

// The two main lanes and the npm-lane templates they're generated from.
const MAIN_LANES = [
  { dir: "next-yak-main", from: "next-yak", desc: "next-yak main (styled)", color: "#7c3aed" },
  { dir: "next-yak-css-main", from: "next-yak-css", desc: "next-yak main (css-prop)", color: "#c026d3" },
];

function removeMainLanes(reason) {
  for (const { dir } of MAIN_LANES) {
    const p = join(TECHS, dir);
    if (existsSync(p)) {
      rmSync(p, { recursive: true, force: true });
      console.log(`  removed techs/${dir}`);
    }
  }
  console.log(reason);
}

// Resolve github `main` HEAD and the commit of the highest `next-yak@<semver>` release tag.
const mainSha = out(`git ls-remote "${REPO}" refs/heads/main`).split(/\s+/)[0];
if (!mainSha) throw new Error("could not resolve next-yak main HEAD");

const tagLines = out(`git ls-remote --tags "${REPO}" "next-yak@*"`).split("\n").filter(Boolean);
// Peeled tags (annotated) expose the real commit as `<sha>\trefs/tags/next-yak@X^{}`; prefer those.
const tagCommit = new Map(); // version-string → commit sha
for (const line of tagLines) {
  const [sha, ref] = line.split(/\s+/);
  const m = ref.match(/refs\/tags\/next-yak@v?(\d+)\.(\d+)\.(\d+)(\^\{\})?$/);
  if (!m) continue;
  const key = `${m[1]}.${m[2]}.${m[3]}`;
  if (m[4] || !tagCommit.has(key)) tagCommit.set(key, sha); // peeled ^{} wins
}
if (!tagCommit.size) throw new Error("no next-yak@<semver> release tags found");
const [latestVer, latestSha] = [...tagCommit.entries()].sort((a, b) => {
  const pa = a[0].split(".").map(Number), pb = b[0].split(".").map(Number);
  return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
})[0];

console.log(`next-yak: main ${mainSha.slice(0, 10)} · latest release next-yak@${latestVer} ${latestSha.slice(0, 10)}`);

if (mainSha === latestSha) {
  removeMainLanes(`✓ main is at the latest release (next-yak@${latestVer}) — github-main lanes skipped (identical to the npm lanes).`);
  process.exit(0);
}

// main is AHEAD of the release → build it and materialise the lanes.
console.log(`main is ahead of next-yak@${latestVer} — building github main and adding the *-main lanes.`);
execSync("node scripts/setup-next-yak.mjs", { cwd: ROOT, stdio: "inherit", env: { ...process.env, NEXT_YAK_REF: mainSha } });

for (const { dir, from, desc, color } of MAIN_LANES) {
  const dst = join(TECHS, dir);
  rmSync(dst, { recursive: true, force: true });
  cpSync(join(TECHS, from), dst, {
    recursive: true,
    filter: (src) => !src.includes("/node_modules") && !src.includes("/dist"),
  });
  const pkg = {
    name: dir,
    description: desc,
    private: true,
    type: "module",
    bench: { color, buildPlugin: "yak", appStylesheet: null, cssKind: "extracted" },
    dependencies: { "next-yak": "link:../../vendor/next-yak/packages/next-yak", react: "catalog:dev", "react-dom": "catalog:dev" },
  };
  writeFileSync(join(dst, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  created techs/${dir} → github main (${mainSha.slice(0, 10)})`);
}
console.log("\n✓ next-yak main lanes ready. Now: pnpm install && pnpm gen --tech 'next-yak*' && pnpm report");
