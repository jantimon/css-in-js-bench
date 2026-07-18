// Vendors @jantimon/web-performance-debugger (wpd) + its browsers into vendor/wpd, isolated from
// the pnpm workspace (npm install in its own folder) so the benchmark's default `pnpm install`
// stays light — wpd pulls Puppeteer + downloads Chrome/Firefox, which most contributors don't need.
//
// This is an OPT-IN heavy setup, like scripts/setup-next-yak.mjs. Run it once before the
// `render-timing` measurement:
//   node scripts/setup-wpd.mjs            install wpd + Chrome + Firefox into vendor/wpd
//   node scripts/setup-wpd.mjs --force    reinstall even if already present
// Then: pnpm gen --measure=render-timing  (gen resolves vendor/wpd/node_modules/.bin/wpd and
// skips render-timing gracefully if this was never run). Needs Node 24+ (wpd requirement).
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WPD_DIR = join(ROOT, "vendor", "wpd");
const WPD_VERSION = process.env.WPD_VERSION || "0.6.0";
const force = process.argv.includes("--force");

const major = Number(process.versions.node.split(".")[0]);
if (major < 24) {
  console.error(`✗ wpd needs Node 24+, but this is ${process.version}. Aborting.`);
  process.exit(1);
}

const bin = join(WPD_DIR, "node_modules", ".bin", "wpd");
if (existsSync(bin) && !force) {
  console.log(`vendor/wpd already installed (${bin}). Use --force to reinstall.`);
  process.exit(0);
}

mkdirSync(WPD_DIR, { recursive: true });
// A private, isolated package so npm doesn't touch the pnpm workspace.
writeFileSync(
  join(WPD_DIR, "package.json"),
  JSON.stringify({ name: "wpd-vendor", private: true, type: "module", dependencies: { "@jantimon/web-performance-debugger": WPD_VERSION } }, null, 2) + "\n",
);

console.log(`installing @jantimon/web-performance-debugger@${WPD_VERSION} into vendor/wpd …`);
execSync("npm install --silent --no-audit --no-fund", { cwd: WPD_DIR, stdio: "inherit" });

// Install the exact Chrome + Firefox builds vendor/wpd's Puppeteer pins (a plain
// `puppeteer browsers install` uses THIS folder's puppeteer version, so the Firefox build
// matches what wpd demands — a globally-installed puppeteer may pin a different version).
console.log("installing Chrome + Firefox for wpd's Puppeteer …");
execSync("npx --yes puppeteer browsers install chrome firefox", { cwd: WPD_DIR, stdio: "inherit" });

console.log("\n✓ vendor/wpd ready. Now: pnpm gen:wpd && pnpm report");
