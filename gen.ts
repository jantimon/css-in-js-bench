// gen — the ONE data-generation script (§8). Discovers cells from the filesystem
// (a cell exists iff techs/<t>/case/<c>/index.tsx exists — no enumerated matrix),
// builds each tech in ISOLATION via its own vite.<measurement>.config.ts, runs each
// measurement `sampleCount` times writing RAW samples (the statistic is the report's
// choice), and always captures the cheap {tsx,html,css} snapshot triplet.
//
// gen imports NOTHING from ../packages — only from inside benchmarks/ — which is what
// keeps the folder extraction-ready (§13).
//
//   pnpm gen:samples                             full battery · all techs · all cases
//   pnpm gen:samples --measure=microbench        narrow to listed measurements
//   pnpm gen:samples --tech 'next-yak*'          glob over tech dirnames
//   pnpm gen:samples --case 'realistic-button'   glob over cases
import { build } from "vite";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import benchConfig from "./bench.config.ts";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import autocannon from "autocannon";
import { chromium, type Browser } from "@playwright/test";
import type { CaseMeta, NsweepSample, PayloadSample, RenderHtmlFn, RunMeta, Snapshot, SourceFile, SsrModule } from "./report/types.ts";
import { SOURCE_EXT } from "./report/types.ts";
import { verify } from "./verify.ts";

// next-yak's SWC plugin chooses dev vs prod class naming from process.env.NODE_ENV at
// PLUGIN INIT — which is BEFORE `vite build` sets NODE_ENV itself. If we don't pin it
// here, the first lane built in a run (and any yak-only run) silently transforms in DEV
// mode (longer class names, unoptimized) — an unfair, non-deterministic mix. Pin prod for
// the whole gen process so every tech, in every run order, is built identically. The
// per-config `define` only fixes the runtime bundle (react-dom), not the build-time plugin.
process.env.NODE_ENV = "production";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TECHS_DIR = join(ROOT, "techs");
const CASES_DIR = join(ROOT, "cases");
const RESULT_DIR = join(ROOT, "result");

// Deliberate, shared viewport for every Playwright pass (hydrate / inp / screenshots) so
// the browser metrics aren't taken at Playwright's implicit default. The SSR passes render
// to a string in node and never touch a screen.
const PAGE_OPTS = {
  viewport: { width: benchConfig.browser.width, height: benchConfig.browser.height },
  deviceScaleFactor: benchConfig.browser.deviceScaleFactor,
};

// CPU_THROTTLE=<rate> slows the browser CPU by `rate`× (CDP Emulation.setCPUThrottlingRate)
// for the wall-clock interactive passes (hydrate / inp / mount). Default 4× (set CPU_THROTTLE=1
// to disable). The point is measurement resolution, not realism-for-its-own-sake: React 18
// hydration is time-sliced into ~5ms scheduler frames, so at unthrottled hydrate times (a
// handful of frames) sitting near a frame boundary flips you ±1 whole slice = large relative
// jitter. Throttling makes each hydration span many more frames, so ±1 frame is a smaller
// fraction, and fixed overhead (timer granularity, poll interval) shrinks relative to the
// larger signal. Measured effect (14 techs × 6 cases, back-to-back): run-to-run movers >15%
// 41 → 7, within-cell relIQR ~37% → 24% and reproducible run-to-run. 4× also matches the
// Lighthouse/CWV default, so it's more representative too. Applied identically to every lane,
// so cross-lane comparisons stay fair.
const CPU_THROTTLE = Math.max(1, Number(process.env.CPU_THROTTLE) || 4);
async function applyCpuThrottle(page: import("@playwright/test").Page): Promise<void> {
  if (CPU_THROTTLE <= 1) return;
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
}

// All measurements gen knows how to run. Each maps to a vite.<name>.config.ts and a
// sampler over the built SSR entry. The slice ships `microbench`; new measurements
// are added here, not by editing the per-tech folders.
const ALL_MEASUREMENTS = ["microbench", "payload", "nsweep", "autocannon", "hydrate", "inp", "mount", "screenshots", "buildtime"] as const;
type Measurement = (typeof ALL_MEASUREMENTS)[number];
// Fast + deterministic → run by default. The heavy ones (autocannon/hydrate/
// inp) and the nsweep are opt-in via `--measure=…` so a plain `pnpm gen:samples` stays quick.
// `buildtime` is opt-in too — it times whole vite builds, so it is slow and machine-dependent.
const DEFAULT_MEASUREMENTS: Measurement[] = ["microbench", "payload"];
// Measurements that run off the microbench SSR build (no separate vite config).
const SSR_MEASUREMENTS = new Set<Measurement>(["microbench", "payload", "nsweep", "autocannon"]);

// ---- tiny CLI ------------------------------------------------------------------
function parseArgs(argv: string[]) {
  const out: { measure?: string; tech?: string; case?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--measure=")) out.measure = a.slice("--measure=".length);
    else if (a === "--measure") out.measure = argv[++i];
    else if (a === "--tech") out.tech = argv[++i];
    else if (a === "--case") out.case = argv[++i];
  }
  return out;
}
// dirname glob: only `*` is supported (matches the spec's `next-yak*` examples).
const globToRe = (g: string) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
const matches = (glob: string | undefined, name: string) => !glob || globToRe(glob).test(name);

const dirsIn = (p: string) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

// ---- discovery (§8.2 step 2) ---------------------------------------------------
interface Cell { tech: string; caseId: string; entry: string }
function discover(args: ReturnType<typeof parseArgs>) {
  const techs = dirsIn(TECHS_DIR)
    .filter((t) => existsSync(join(TECHS_DIR, t, "package.json")))
    .filter((t) => matches(args.tech, t));
  const cases = readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, ""))
    .filter((c) => matches(args.case, c));
  const cells: Cell[] = [];
  for (const tech of techs)
    for (const caseId of cases) {
      const entry = join(TECHS_DIR, tech, "case", caseId, "index.tsx");
      if (existsSync(entry)) cells.push({ tech, caseId, entry });
    }
  return { techs, cases, cells };
}

// ---- build one tech's measurement bundle, return its renderCase (§8.2 step 3) ---
async function buildTech(tech: string, measurement: Measurement): Promise<SsrModule> {
  const configPath = join(TECHS_DIR, tech, `vite.${measurement}.config.ts`);
  if (!existsSync(configPath)) throw new Error(`${tech}: missing vite.${measurement}.config.ts`);
  // Import the config module directly (gen runs under tsx/ESM) instead of letting
  // vite re-bundle it — vite's config loader requires() the file, which breaks on
  // ESM-only plugins like next-yak/vite. Resolve fn/promise → inline config.
  let cfg = (await import(pathToFileURL(configPath).href + `?t=${Date.now()}`)).default;
  if (typeof cfg === "function") cfg = cfg();
  cfg = await cfg;
  await build({ ...cfg, configFile: false, logLevel: "warn" });
  const out = join(TECHS_DIR, tech, "dist", measurement, "entry.mjs");
  if (!existsSync(out)) throw new Error(`${tech}: build produced no ${out}`);
  return (await import(pathToFileURL(out).href + `?t=${Date.now()}`)) as SsrModule;
}

// ---- microbench sampler: SSR render throughput (renders/sec, higher better) -----
// Times the production SSR render ONLY (renderHtml) — never the snapshot/payload CSS
// collection (a tailwind JIT or panda slice is build-time work, not per-request).
function microbench(renderHtml: RenderHtmlFn, caseId: string, n: number): number[] {
  const { warmup } = benchConfig;
  const sampleCount = samplesFor("microbench");
  for (let w = 0; w < warmup; w++) renderHtml(caseId, 1); // warm V8 / JIT, discarded
  const samples: number[] = [];
  for (let s = 0; s < sampleCount; s++) {
    const t0 = process.hrtime.bigint();
    renderHtml(caseId, n);
    const t1 = process.hrtime.bigint();
    const sec = Number(t1 - t0) / 1e9;
    samples.push(Math.round(n / sec)); // instance renders per second
  }
  return samples;
}

// ---- nsweep sampler: SSR render time vs instance count (the scaling/crossover) ---
// Times one render of the case at each instance count n (= distinct values for dynamic
// cases). Shows how each lane scales — flat-ish for build-time CSS, super-linear for the
// pathological runtimes. Reuses renderHtml (no CSS work).
function nsweepSample(mod: SsrModule, caseId: string): NsweepSample[] {
  const { ns, iters } = benchConfig.nsweep;
  const render = htmlOf(mod);
  return ns.map((n) => {
    for (let w = 0; w < 3; w++) render(caseId, n); // warmup
    const walls: number[] = [];
    for (let it = 0; it < iters; it++) {
      const t0 = process.hrtime.bigint();
      render(caseId, n);
      walls.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    return { n, ms: Math.round(median(walls) * 1000) / 1000 };
  });
}

// ---- payload sampler: bytes shipped for the page (gzipped, lower better) --------
// Deterministic, so one "sample" suffices. CSS is the deduped sheet that render
// needed; HTML is the n-instance markup; JS is the lane's marginal client-bundle cost
// (see payloadJsBytes — same for every case of a tech, it's the runtime footprint).
function payload(mod: SsrModule, caseId: string, n: number, js: number): PayloadSample[] {
  const { html, css } = mod.renderCase(caseId, n);
  return [{ js, css: gzipSync(css).length, html: gzipSync(html).length }];
}

// JS bytes a lane ships, as the MARGINAL gzipped client bundle over the bare-React
// floor. Each tech's hydrate browser build (vite.hydrate.config) is its real client
// bundle — react + react-dom + the styling runtime + the case components. The vanilla
// lane is the framework floor (react only, no styling runtime), so subtracting it
// leaves the lane's own runtime cost. It's per-TECH (the bundle isn't case-split), so
// every case of a tech reports the same js — the lane's footprint, not a per-page split.
const hydrateGzCache = new Map<string, number>();
async function hydrateBundleGz(tech: string): Promise<number> {
  const cached = hydrateGzCache.get(tech);
  if (cached !== undefined) return cached;
  await buildOnly(tech, "hydrate");
  const bundle = join(TECHS_DIR, tech, "dist", "hydrate", "entry.js");
  if (!existsSync(bundle)) throw new Error(`${tech}: hydrate build produced no entry.js`);
  const gz = gzipSync(readFileSync(bundle)).length;
  hydrateGzCache.set(tech, gz);
  return gz;
}
let frameworkFloor: number | null = null;
async function frameworkFloorGz(): Promise<number> {
  if (frameworkFloor === null)
    frameworkFloor = existsSync(join(TECHS_DIR, "vanilla", "vite.hydrate.config.ts")) ? await hydrateBundleGz("vanilla") : 0;
  return frameworkFloor;
}
async function payloadJsBytes(tech: string): Promise<number> {
  try {
    return Math.max(0, (await hydrateBundleGz(tech)) - (await frameworkFloorGz()));
  } catch (e) {
    console.error(`  ! ${tech}: payload js unavailable (${(e as Error).message.split("\n")[0]}) — js=0`);
    return 0;
  }
}

/** The hot-path renderer for a tech: renderHtml if provided, else renderCase().html. */
const htmlOf = (mod: SsrModule): RenderHtmlFn => mod.renderHtml ?? ((c, n) => mod.renderCase(c, n).html);

// ---- autocannon sampler: SSR throughput under HTTP load (req/sec, higher better) -
// Boots a tiny server that renders the case per request (the real per-request SSR
// cost), runs autocannon `rounds` times, returns the per-round mean req/sec. Heavy +
// machine-dependent → run on an idle box via `gen --measure=autocannon`.
async function autocannonSample(mod: SsrModule, caseId: string, n: number): Promise<number[]> {
  const { rounds, durationSec, connections, warmupRounds = 0 } = benchConfig.autocannon;
  const render = htmlOf(mod);
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(render(caseId, n));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}`;
  const samples: number[] = [];
  try {
    for (let i = 0; i < warmupRounds; i++) await autocannon({ url, duration: durationSec, connections }); // discarded: warm the server's JIT
    for (let i = 0; i < rounds; i++) {
      const result = await autocannon({ url, duration: durationSec, connections });
      samples.push(Math.round(result.requests.average));
    }
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
  return samples;
}

const median = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted.length ? sorted[sorted.length >> 1] : 0;
};
// Measured samples for a measurement — a per-measurement override (bench.config `samples`)
// or the shared default.
const samplesFor = (measurement: string): number => benchConfig.samples?.[measurement] ?? benchConfig.sampleCount;

// ---- hydrate: client hydration time (ms, lower better) ---------------------------
// Reuses the SSR markup (renderHtml) as the thing to hydrate, plus a per-tech BROWSER
// build (vite.hydrate.config) whose client-entry calls hydrateRoot on it. A tiny server
// serves both; Playwright loads the page and reads window.__hydrateMs (set by the
// entry's useEffect once the hydration commit lands). Heavy + machine-dependent.
async function buildOnly(tech: string, measurement: Measurement): Promise<void> {
  const configPath = join(TECHS_DIR, tech, `vite.${measurement}.config.ts`);
  if (!existsSync(configPath)) throw new Error(`${tech}: missing vite.${measurement}.config.ts`);
  let cfg = (await import(pathToFileURL(configPath).href + `?t=${Date.now()}`)).default;
  if (typeof cfg === "function") cfg = cfg();
  cfg = await cfg;
  await build({ ...cfg, configFile: false, logLevel: "warn" });
}
// ---- buildtime sampler: how long a lane's CLIENT (hydrate) build takes (ms, lower better) --
// Keyed per LANE, not per cell — a build compiles every workload at once, so there is one
// number per tech, not one per case. We time the SAME hydrate build a user actually ships
// (vite production client bundle over client-entry.tsx), via buildOnly.
//
// Honest semantics (documented here + in the report tooltip):
//   cold — before each build, delete everything a fresh checkout would have to regenerate:
//          the lane's hydrate output, vite's on-disk caches, and Panda's generated
//          styled-system (its codegen runs in the build's buildStart, so clearing it forces a
//          full regen). This is the cache-miss build.
//   warm — the same build repeated immediately with nothing cleared.
//   LIMITATION: buildOnly runs vite's build() IN THIS node process, not a fresh spawn, so V8
//   and ESM module caches stay warm across samples — this is not an OS-cold process build.
//   And `vite build` keeps NO persistent build cache of its own, so for most lanes cold≈warm;
//   that closeness is the finding, not a defect. The report shows cold as the headline and
//   warm as context so the two can be compared directly.
function clearBuildCaches(tech: string): void {
  const techDir = join(TECHS_DIR, tech);
  const targets = [
    join(techDir, "dist", "hydrate"), // the client bundle we rebuild + time
    join(techDir, "node_modules", ".vite"), // per-lane vite cache, if any
    join(ROOT, "node_modules", ".vite"), // workspace-root vite cache, if any
    join(techDir, "styled-system"), // Panda codegen output (regenerated in buildStart)
  ];
  for (const t of targets) rmSync(t, { recursive: true, force: true }); // paths absent for a lane are no-ops
}
async function buildtimeSample(tech: string): Promise<{ cold: number[]; warm: number[] }> {
  const S = samplesFor("buildtime");
  const timeBuild = async (): Promise<number> => {
    const t0 = process.hrtime.bigint();
    await buildOnly(tech, "hydrate");
    return Math.round(Number(process.hrtime.bigint() - t0) / 1e6);
  };
  const cold: number[] = [];
  for (let s = 0; s < S; s++) {
    clearBuildCaches(tech);
    cold.push(await timeBuild());
  }
  const warm: number[] = [];
  for (let s = 0; s < S; s++) warm.push(await timeBuild()); // immediate repeat, nothing cleared
  return { cold, warm };
}

// Build the hydrate client bundle and stand up the SSR-markup + bundle server (no browser).
// Shared by the hydrate, INP, and mount Playwright passes.
async function serveHydrate(tech: string, ssrMod: SsrModule): Promise<{ port: number; close: () => Promise<void> }> {
  await buildOnly(tech, "hydrate");
  const bundle = join(TECHS_DIR, tech, "dist", "hydrate", "entry.js");
  if (!existsSync(bundle)) throw new Error(`${tech}: hydrate build produced no entry.js`);
  const bundleJs = readFileSync(bundle);
  const render = htmlOf(ssrMod);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/entry.js") {
      res.setHeader("content-type", "text/javascript");
      return res.end(bundleJs);
    }
    const caseId = url.searchParams.get("case") ?? "";
    const n = Number(url.searchParams.get("n") ?? "1");
    // mount mode renders into an EMPTY root from scratch (cold client mount); every other
    // consumer hydrates the SSR markup, so the root carries it. Guard a missing case (e.g. a
    // stray favicon request from wpd's browser) so the handler never throws and kills gen.
    const body = url.searchParams.get("mount") === "1" || !caseId ? "" : render(caseId, n);
    res.setHeader("content-type", "text/html");
    res.end(`<!doctype html><meta charset=utf-8><div id="root">${body}</div><script type="module" src="/entry.js"></script>`);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { port, close: () => new Promise<void>((r) => server.close(() => r())) };
}

// Serve the hydrate bundle, launch a browser, and hand (browser, port) to `run`. Shared by
// hydrate + inp + mount (same client-entry bundle).
async function withHydrateServer<T>(tech: string, ssrMod: SsrModule, run: (browser: Browser, port: number) => Promise<T>): Promise<T> {
  const { port, close } = await serveHydrate(tech, ssrMod);
  const browser = await chromium.launch();
  try {
    return await run(browser, port);
  } finally {
    await browser.close();
    await close();
  }
}

// hydrate: fresh page per sample → time the initial hydration commit (window.__hydrateMs).
// Sampled ROUND-ROBIN across cells (one sample of every cell per round) so a transient load
// spike spreads across all cells instead of skewing one cell's contiguous block, with a
// discarded warmup round (r = -1) that populates Chromium's per-URL JS code cache — the
// counted samples then time a warm-code hydration commit, not a one-shot cold V8 compile
// (the dominant source of hydrate variance).
async function hydrateTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, number[]>> {
  return withHydrateServer(tech, ssrMod, async (browser, port) => {
    const S = samplesFor("hydrate");
    const acc: Record<string, number[]> = Object.fromEntries(cells.map((c) => [`${c.caseId}/${tech}`, [] as number[]]));
    for (let r = -1; r < S; r++) {
      for (const cell of cells) {
        const n = caseMeta[cell.caseId].n;
        const page = await browser.newPage(PAGE_OPTS);
        await applyCpuThrottle(page);
        await page.goto(`http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}`, { waitUntil: "load" });
        await page.waitForFunction(() => window.__hydrateMs !== undefined, null, { timeout: 30_000 });
        const ms = await page.evaluate(() => window.__hydrateMs as number);
        await page.close();
        if (r >= 0) acc[`${cell.caseId}/${tech}`].push(Math.round(ms * 100) / 100);
      }
    }
    return acc;
  });
}

// inp: hydrate once per cell, then re-render the mounted workload in place repeatedly,
// timing click→next-paint (window.__inp). One page load, many samples — warmup discarded.
async function inpTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, number[]>> {
  return withHydrateServer(tech, ssrMod, async (browser, port) => {
    const out: Record<string, number[]> = {};
    for (const cell of cells) {
      const n = caseMeta[cell.caseId].n;
      const page = await browser.newPage(PAGE_OPTS);
      await applyCpuThrottle(page);
      await page.goto(`http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.__inp !== undefined && window.__hydrateMs !== undefined, null, { timeout: 30_000 });
      for (let w = 0; w < 3; w++) await page.evaluate(() => window.__inp!()); // warmup, discarded
      const samples: number[] = [];
      for (let s = 0; s < samplesFor("inp"); s++) samples.push(await page.evaluate(() => window.__inp!()));
      await page.close();
      out[`${cell.caseId}/${tech}`] = samples.map((x) => Math.round(x * 100) / 100);
    }
    return out;
  });
}

// mount: fresh page on a BLANK root, then a from-scratch client render on "click" — time the
// cold-mount commit (window.__mountMs). Unlike hydrate (which attaches to existing markup),
// the first paint here includes each runtime lib's first style injection into the document.
// Round-robin across cells with a discarded warmup round, same as hydrateTech.
async function mountTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, number[]>> {
  return withHydrateServer(tech, ssrMod, async (browser, port) => {
    const S = samplesFor("mount");
    const acc: Record<string, number[]> = Object.fromEntries(cells.map((c) => [`${c.caseId}/${tech}`, [] as number[]]));
    for (let r = -1; r < S; r++) {
      for (const cell of cells) {
        const n = caseMeta[cell.caseId].n;
        const page = await browser.newPage(PAGE_OPTS);
        await applyCpuThrottle(page);
        await page.goto(`http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}&mount=1`, { waitUntil: "load" });
        await page.waitForFunction(() => typeof window.__mount === "function", null, { timeout: 30_000 });
        await page.evaluate(() => window.__mount!());
        await page.waitForFunction(() => window.__mountMs !== undefined, null, { timeout: 30_000 });
        const ms = await page.evaluate(() => window.__mountMs as number);
        await page.close();
        if (r >= 0) acc[`${cell.caseId}/${tech}`].push(Math.round(ms * 100) / 100);
      }
    }
    return acc;
  });
}

// ---- screenshots: a rendered preview of each cell (visual parity across lanes) ---
// Serves the SSR { html, css } (no hydration needed for a static preview) in a headless
// browser and snapshots the rendered root → result/assets/<case>__<tech>.png. Writes a
// path map (measurement-screenshots.json) the report uses to reference the images from a
// sibling assets/ folder (§10.6). n is capped so the preview stays readable.
async function screenshotTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, string[]>> {
  const assetsDir = join(RESULT_DIR, "assets");
  mkdirSync(assetsDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const out: Record<string, string[]> = {};
    const page = await browser.newPage({ ...PAGE_OPTS, deviceScaleFactor: 2 }); // crisp images
    for (const cell of cells) {
      const n = Math.min(caseMeta[cell.caseId].n, 6); // a handful of instances reads better than 1,000
      const { html, css } = ssrMod.renderCase(cell.caseId, n);
      // The harness renders n bare instances with no parent layout; left as inline-block
      // they collapse to min-content (a tall, text-wrapped strip). Lay them out in a bounded
      // responsive grid so each instance gets a real width and reads like the real page.
      const doc =
        `<!doctype html><meta charset=utf-8><style>*{box-sizing:border-box}body{margin:0}` +
        `#root{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;align-items:start;width:760px;padding:24px;background:#fff}` +
        `${css}</style><div id="root">${html}</div>`;
      await page.setContent(doc, { waitUntil: "load" });
      const el = await page.$("#root");
      const file = `${cell.caseId}__${tech}.png`;
      await (el ?? page).screenshot({ path: join(assetsDir, file) });
      out[`${cell.caseId}/${tech}`] = [`assets/${file}`];
    }
    await page.close();
    return out;
  } finally {
    await browser.close();
  }
}

// Every authored file of a cell, verbatim (the invariant: benchmarked source === displayed
// source). index.tsx leads because it is the entry, the rest follow alphabetically, and the
// report gives each one its own tab — so a five-file case reads as five files rather than
// one blob. An extension outside SOURCE_EXT is an error, not a skipped file.
function caseSource(entry: string): SourceFile[] {
  const dir = dirname(entry);
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);
  for (const f of files) {
    const ext = f.slice(f.lastIndexOf("."));
    if (!(ext in SOURCE_EXT)) {
      console.error(`${join(dir, f)}: unknown source extension "${ext}" — add it to SOURCE_EXT in report/types.ts (known: ${Object.keys(SOURCE_EXT).join(", ")})`);
      process.exit(1);
    }
  }
  return files
    .sort((a, b) => Number(b === "index.tsx") - Number(a === "index.tsx") || a.localeCompare(b))
    .map((name) => ({ name, code: readFileSync(join(dir, name), "utf8") }));
}

// ---- main ----------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Validate rather than filter: a silently dropped typo measures nothing, still rewrites
  // the snapshots, and prints "measurements:" with an empty list, which reads as success.
  // `none` is the documented way to ask for exactly that — snapshots only, no measurement.
  const requested = args.measure ? args.measure.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MEASUREMENTS;
  const unknown = requested.filter((m) => m !== "none" && !ALL_MEASUREMENTS.includes(m as Measurement));
  if (unknown.length) {
    console.error(`unknown --measure: ${unknown.join(", ")}\nvalid: ${ALL_MEASUREMENTS.join(", ")}, none (snapshots only)`);
    process.exit(1);
  }
  const measurements = requested.filter((m): m is Measurement => ALL_MEASUREMENTS.includes(m as Measurement));
  const { techs, cases, cells } = discover(args);
  if (!cells.length) {
    console.error("no cells matched (techs/<t>/case/<c>/index.tsx). Check --tech/--case globs.");
    process.exit(1);
  }
  // Result files MERGE per cell, so a filtered (--tech/--case) or partial-measure run
  // never drops the cells it isn't regenerating — and a default run can't nuke heavy
  // autocannon data produced by a separate `--measure=…` run. An unfiltered
  // run of a given measurement still refreshes that measurement's whole file (every cell
  // it covers is rewritten), so removed cells fall out of the measurements being run.
  mkdirSync(RESULT_DIR, { recursive: true });
  const unfiltered = !args.tech && !args.case;
  if (unfiltered)
    for (const m of measurements) {
      rmSync(join(RESULT_DIR, `measurement-${m}.json`), { force: true });
      if (m === "screenshots") rmSync(join(RESULT_DIR, "assets"), { recursive: true, force: true }); // drop stale PNGs
    }
  console.log(`discovered ${cells.length} cell(s) · ${techs.length} tech(s) × ${cases.length} case(s)`);
  if (CPU_THROTTLE > 1) console.log(`⚙ CPU throttle: ${CPU_THROTTLE}× on hydrate/inp/mount (browser wall-clock passes)`);

  // case metadata (for n) — imported once.
  const caseMeta: Record<string, CaseMeta> = {};
  for (const c of cases) caseMeta[c] = (await import(pathToFileURL(join(CASES_DIR, `${c}.ts`)).href)).default;

  const snapshots: Record<string, Snapshot> = {};

  // One isolated build per tech per measurement; reuse it for that tech's cells +
  // (on the first build of a tech) the snapshot triplet.
  for (const tech of techs) {
    const techCells = cells.filter((c) => c.tech === tech);
    if (!techCells.length) continue;

    // One isolated build per tech; a broken/in-progress tech is skipped, not fatal.
    let ssrMod: SsrModule;
    try {
      ssrMod = await buildTech(tech, "microbench");
    } catch (e) {
      console.error(`  ✗ ${tech}: build failed — skipped (${(e as Error).message.split("\n")[0]})`);
      continue;
    }
    // Snapshots always run, off the microbench build (the SSR { html, css } path).
    for (const cell of techCells) {
      const { html, css } = ssrMod.renderCase(cell.caseId, benchConfig.snapshotN);
      snapshots[`${cell.caseId}/${tech}`] = { files: caseSource(cell.entry), html, css };
    }

    for (const measurement of measurements) {
      const file = join(RESULT_DIR, `measurement-${measurement}.json`);
      const data: Record<string, unknown> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
      // buildtime is a per-LANE pass (one build compiles every workload), so it writes one
      // record keyed by the tech name rather than per cell.
      if (measurement === "buildtime") {
        try {
          const bt = await buildtimeSample(tech);
          data[tech] = bt;
          writeFileSync(file, JSON.stringify(data, null, 0) + "\n");
          console.log(`  ${tech} · buildtime: cold ${median(bt.cold)}ms / warm ${median(bt.warm)}ms (${bt.cold.length} samples)`);
        } catch (e) {
          console.error(`  ✗ ${tech} · buildtime: ${(e as Error).message.split("\n")[0]} — skipped`);
        }
        continue;
      }
      // hydrate + inp + mount + screenshots are browser passes over the SSR markup.
      const browserFns = { hydrate: hydrateTech, inp: inpTech, mount: mountTech, screenshots: screenshotTech } as const;
      if (measurement in browserFns) {
        const fn = browserFns[measurement as keyof typeof browserFns];
        try {
          Object.assign(data, await fn(tech, ssrMod, techCells, caseMeta));
          writeFileSync(file, JSON.stringify(data, null, 0) + "\n");
          console.log(`  ${tech} · ${measurement}: ${techCells.length} cell(s)`);
        } catch (e) {
          console.error(`  ✗ ${tech} · ${measurement}: ${(e as Error).message.split("\n")[0]} — skipped`);
        }
        continue;
      }
      // SSR measurements reuse the one microbench build; others get their own.
      const mod = SSR_MEASUREMENTS.has(measurement) ? ssrMod : await buildTech(tech, measurement);
      for (const cell of techCells) {
        const n = caseMeta[cell.caseId].n;
        const key = `${cell.caseId}/${tech}`;
        if (measurement === "microbench") data[key] = microbench(htmlOf(mod), cell.caseId, n);
        else if (measurement === "payload") data[key] = payload(mod, cell.caseId, n, await payloadJsBytes(tech));
        else if (measurement === "nsweep") data[key] = nsweepSample(mod, cell.caseId);
        else if (measurement === "autocannon") data[key] = await autocannonSample(mod, cell.caseId, n);
      }
      writeFileSync(file, JSON.stringify(data, null, 0) + "\n");
      console.log(`  ${tech} · ${measurement}: ${techCells.length} cell(s)`);
    }
  }

  // Merge snapshots so a filtered run keeps the cells it didn't regenerate.
  const snapFile = join(RESULT_DIR, "snapshot.json");
  const allSnaps: Record<string, Snapshot> = { ...(existsSync(snapFile) ? JSON.parse(readFileSync(snapFile, "utf8")) : {}), ...snapshots };
  writeFileSync(snapFile, JSON.stringify(allSnaps, null, 0) + "\n");

  let gitSha = "";
  try {
    gitSha = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  } catch {}
  const allTechs = [...new Set(Object.keys(allSnaps).map((k) => k.split("/")[1]))].sort();
  const allCases = [...new Set(Object.keys(allSnaps).map((k) => k.split("/")[0]))].sort();
  // host describes the hardware, not the machine's network name (the report publishes it).
  const meta: RunMeta = { host: `${os.cpus()[0]?.model ?? "unknown"} (${os.arch()})`, node: process.version, timestamp: new Date().toISOString(), gitSha, techs: allTechs, cases: allCases, snapshotN: benchConfig.snapshotN };
  writeFileSync(join(RESULT_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`✓ wrote result/ — ${Object.keys(snapshots).length} snapshot(s), measurements: ${measurements.join(", ")}`);

  // Parity gate: prove every lane STILL renders identically (same DOM, clean attributes,
  // matching pixels, SSR↔hydrate consistent) before the numbers are trusted. Static checks
  // always run; the pixel/hydrate checks reuse exactly what this run just built. A failure
  // marks the process non-zero but never discards the data already on disk.
  if (process.env.SKIP_VERIFY) {
    console.log("verify: skipped (SKIP_VERIFY set) — run `pnpm verify` to gate parity.");
  } else {
    try {
      const { ok } = await verify();
      if (!ok) process.exitCode = 1;
    } catch (e) {
      console.error(`verify: crashed — ${(e as Error).message.split("\n")[0]}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
