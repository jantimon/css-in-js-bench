// gen — the ONE data-generation script (§8). Discovers cells from the filesystem
// (a cell exists iff techs/<t>/case/<c>/index.tsx exists — no enumerated matrix),
// builds each tech in ISOLATION via its own vite.<measurement>.config.ts, runs each
// measurement `sampleCount` times writing RAW samples (the statistic is the report's
// choice), and always captures the cheap {tsx,html,css} snapshot triplet.
//
// gen imports NOTHING from ../packages — only from inside benchmarks/ — which is what
// keeps the folder extraction-ready (§13).
//
//   pnpm gen                             full battery · all techs · all cases
//   pnpm gen --measure=microbench        narrow to listed measurements
//   pnpm gen --tech 'next-yak*'          glob over tech dirnames
//   pnpm gen --case 'realistic-button'   glob over cases
import { build } from "vite";
import { execSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import benchConfig from "./bench.config.ts";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { Session } from "node:inspector/promises";
import autocannon from "autocannon";
import { chromium, type Browser } from "@playwright/test";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import type { AttributionSample, CaseMeta, NsweepSample, PayloadSample, RenderHtmlFn, RenderTimingMetrics, RenderTimingSample, RunMeta, Snapshot, SsrModule } from "./report/types.ts";

const execFileP = promisify(execFile);
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

// wpd (@jantimon/web-performance-debugger) for the opt-in `render-timing` pass — vendored,
// isolated from the pnpm workspace, by `pnpm setup:wpd`. Absent unless that ran → render-timing
// skips gracefully. The driver module must live inside the cwd wpd runs in (here: ROOT).
const WPD_BIN = join(ROOT, "vendor", "wpd", "node_modules", ".bin", "wpd");
const WPD_FLOW = join(ROOT, "scripts", "wpd", "render-flow.mjs");

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
// so cross-lane comparisons stay fair. NOT applied to the profiler-based attribution passes
// (it would distort per-package self-time).
const CPU_THROTTLE = Math.max(1, Number(process.env.CPU_THROTTLE) || 4);
async function applyCpuThrottle(page: import("@playwright/test").Page): Promise<void> {
  if (CPU_THROTTLE <= 1) return;
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
}

// All measurements gen knows how to run. Each maps to a vite.<name>.config.ts and a
// sampler over the built SSR entry. The slice ships `microbench`; new measurements
// are added here, not by editing the per-tech folders.
const ALL_MEASUREMENTS = ["microbench", "payload", "nsweep", "autocannon", "attribution", "hydrate", "hydrate-attribution", "inp", "inp-attribution", "mount", "mount-attribution", "render-timing", "screenshots"] as const;
type Measurement = (typeof ALL_MEASUREMENTS)[number];
// Fast + deterministic → run by default. The heavy ones (autocannon/attribution/hydrate/
// inp) and the nsweep are opt-in via `--measure=…` so a plain `pnpm gen` stays quick.
const DEFAULT_MEASUREMENTS: Measurement[] = ["microbench", "payload"];
// Measurements that run off the microbench SSR build (no separate vite config).
const SSR_MEASUREMENTS = new Set<Measurement>(["microbench", "payload", "nsweep", "autocannon", "attribution"]);

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

// ---- attribution: where the SSR render time goes (per-package self-time) ---------
// Profiles renderHtml in real node V8 (in-process — the right environment for an SSR
// cost) and splits the MEDIAN wall time by each bucket's share of CPU self-time. The
// per-tech bundle is built un-minified with a sourcemap, so each profiled frame maps
// back to its original package (react-dom / styling lib / the component).
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : 0;
};
// Measured samples for a measurement — a per-measurement override (bench.config `samples`)
// or the shared default. The flakiest browser passes take more (see bench.config).
const samplesFor = (m: string): number => benchConfig.samples?.[m] ?? benchConfig.sampleCount;
function bucketFor(src: string | null): "react" | "lib" | "component" | "other" {
  if (!src) return "other";
  if (/node_modules\/(react-dom|react|scheduler|react-is)\//.test(src)) return "react";
  // the styling lib + its deps: node_modules, OR Panda's codegen output (styled-system,
  // which is generated into the lane folder, not node_modules).
  if (/node_modules\/|styled-system\//.test(src)) return "lib";
  if (/\/case\/|ssr-entry|client-entry/.test(src)) return "component";
  return "other";
}
// Split a V8 CPU profile (node SSR or browser hydrate) into per-bucket self-time hits by
// mapping each profiled frame back through the un-minified bundle's sourcemap. Shared by the
// SSR attribution and the two browser (hydrate / interaction) attributions — same buckets,
// only the bundle filename differs (entry.mjs vs entry.js).
function attributeProfile(profile: { nodes?: { hitCount?: number; callFrame: { url: string; lineNumber: number; columnNumber: number } }[] } | undefined, map: TraceMap | null, bundleName: string) {
  const hits = { react: 0, lib: 0, component: 0, other: 0 };
  for (const node of profile?.nodes ?? []) {
    if (!node.hitCount) continue;
    const f = node.callFrame;
    let b: keyof typeof hits = "other";
    if (map && f.url.includes(bundleName)) b = bucketFor(originalPositionFor(map, { line: f.lineNumber + 1, column: f.columnNumber }).source);
    hits[b] += node.hitCount;
  }
  return hits;
}
// Anchor a measured median wall (ms) and split it by a profile's per-bucket CPU share — the
// AttributionSample shape the report's stacked AttributionChart consumes.
function splitByHits(renderMs: number, hits: { react: number; lib: number; component: number; other: number }): AttributionSample {
  const total = hits.react + hits.lib + hits.component + hits.other || 1;
  const part = (h: number) => (renderMs * h) / total;
  return { renderMs, react: part(hits.react), lib: part(hits.lib), component: part(hits.component), other: part(hits.other) };
}
async function attributionSample(tech: string, mod: SsrModule, caseId: string, n: number): Promise<AttributionSample[]> {
  const { loop, iters, warmup } = benchConfig.attribution;
  const render = htmlOf(mod);
  for (let w = 0; w < warmup * loop; w++) render(caseId, n); // warm V8

  // (1) median wall per render — anchors the absolute height.
  const walls: number[] = [];
  for (let it = 0; it < iters; it++) {
    const t0 = process.hrtime.bigint();
    for (let k = 0; k < loop; k++) render(caseId, n);
    walls.push(Number(process.hrtime.bigint() - t0) / 1e6 / loop);
  }
  const renderMs = median(walls);

  // (2) CPU profile over the same loop → per-bucket hit share.
  const session = new Session();
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.setSamplingInterval", { interval: 80 });
  await session.post("Profiler.start");
  for (let it = 0; it < iters; it++) for (let k = 0; k < loop; k++) render(caseId, n);
  const { profile } = await session.post("Profiler.stop");
  session.disconnect();

  const mapPath = join(TECHS_DIR, tech, "dist", "microbench", "entry.mjs.map");
  const map = existsSync(mapPath) ? new TraceMap(readFileSync(mapPath, "utf8")) : null;
  const hits = { react: 0, lib: 0, component: 0, other: 0 };
  for (const node of profile?.nodes ?? []) {
    if (!node.hitCount) continue;
    const f = node.callFrame;
    let b: keyof typeof hits = "other";
    if (map && f.url.includes("entry.mjs")) {
      // url carries a ?t= cache-buster from the dynamic import — match by substring.
      const pos = originalPositionFor(map, { line: f.lineNumber + 1, column: f.columnNumber });
      b = bucketFor(pos.source);
    }
    hits[b] += node.hitCount;
  }
  const total = hits.react + hits.lib + hits.component + hits.other || 1;
  const part = (h: number) => (renderMs * h) / total;
  return [{ renderMs, react: part(hits.react), lib: part(hits.lib), component: part(hits.component), other: part(hits.other) }];
}

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
// Build the hydrate client bundle and stand up the SSR-markup + bundle server (no browser).
// Shared by withHydrateServer (Playwright passes) and renderTimingTech (wpd's own browser).
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

// ---- hydrate-attribution / inp-attribution / mount-attribution: where the CLIENT time goes ----------
// The browser counterpart of the SSR `attribution`: split the median client wall (hydration
// commit, or an in-place re-render) into react / styling-lib / your-component self-time. Uses
// an UN-minified + sourcemapped variant of the hydrate browser build (so each V8 frame maps
// back to its package, same as the SSR microbench build is un-minified for `attribution`), a
// CDP Profiler over exactly the measured action, and the shared attributeProfile/splitByHits.
async function buildHydrateAttr(tech: string): Promise<{ bundleJs: Buffer; map: TraceMap | null }> {
  const cfgPath = join(TECHS_DIR, tech, "vite.hydrate.config.ts");
  if (!existsSync(cfgPath)) throw new Error(`${tech}: missing vite.hydrate.config.ts`);
  let cfg = (await import(pathToFileURL(cfgPath).href + `?t=${Date.now()}`)).default;
  if (typeof cfg === "function") cfg = cfg();
  cfg = await cfg;
  // un-minified + sourcemap into a sibling dir so the real (minified) hydrate timing build is untouched.
  cfg = { ...cfg, build: { ...cfg.build, outDir: "dist/hydrate-attr", minify: false, sourcemap: true } };
  await build({ ...cfg, configFile: false, logLevel: "warn" });
  const bundle = join(TECHS_DIR, tech, "dist", "hydrate-attr", "entry.js");
  if (!existsSync(bundle)) throw new Error(`${tech}: hydrate-attr build produced no entry.js`);
  const map = existsSync(bundle + ".map") ? new TraceMap(readFileSync(bundle + ".map", "utf8")) : null;
  return { bundleJs: readFileSync(bundle), map };
}
// Build the attr bundle, serve SSR-markup + bundle, launch a browser, hand (browser, port, map) to run.
async function withAttrServer<T>(tech: string, ssrMod: SsrModule, run: (browser: Browser, port: number, map: TraceMap | null) => Promise<T>): Promise<T> {
  const { bundleJs, map } = await buildHydrateAttr(tech);
  const render = htmlOf(ssrMod);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/entry.js") {
      res.setHeader("content-type", "text/javascript");
      return res.end(bundleJs);
    }
    const caseId = url.searchParams.get("case") ?? "";
    const n = Number(url.searchParams.get("n") ?? "1");
    const body = url.searchParams.get("mount") === "1" ? "" : render(caseId, n);
    res.setHeader("content-type", "text/html");
    res.end(`<!doctype html><meta charset=utf-8><div id="root">${body}</div><script type="module" src="/entry.js"></script>`);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch();
  try {
    return await run(browser, port, map);
  } finally {
    await browser.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
}
// hydrate-attribution: load with ?manual=1 (defers hydration), start the profiler, trigger the
// SINGLE hydration commit, stop — so the samples cover exactly the hydration, no page-load noise.
async function hydrateAttrTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, AttributionSample[]>> {
  return withAttrServer(tech, ssrMod, async (browser, port, map) => {
    type Hits = { react: number; lib: number; component: number; other: number };
    const S = samplesFor("hydrate-attribution");
    const walls: Record<string, number[]> = {};
    const hits: Record<string, Hits> = {};
    for (const c of cells) {
      const k = `${c.caseId}/${tech}`;
      walls[k] = [];
      hits[k] = { react: 0, lib: 0, component: 0, other: 0 };
    }
    // Round-robin across cells; r = -1 is a discarded warmup hydration (no profiler) that
    // warms the per-URL code cache so the profiled samples aren't skewed by cold compile.
    for (let r = -1; r < S; r++) {
      for (const cell of cells) {
        const n = caseMeta[cell.caseId].n;
        const key = `${cell.caseId}/${tech}`;
        const page = await browser.newPage(PAGE_OPTS);
        const client = await page.context().newCDPSession(page);
        await page.goto(`http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}&manual=1`, { waitUntil: "load" });
        await page.waitForFunction(() => typeof window.__hydrate === "function", null, { timeout: 30_000 });
        if (r < 0) {
          await page.evaluate(() => window.__hydrate!());
          await page.waitForFunction(() => window.__hydrateMs !== undefined, null, { timeout: 30_000 });
          await page.close();
          continue;
        }
        await client.send("Profiler.enable");
        await client.send("Profiler.setSamplingInterval", { interval: 50 });
        await client.send("Profiler.start");
        await page.evaluate(() => window.__hydrate!());
        await page.waitForFunction(() => window.__hydrateMs !== undefined, null, { timeout: 30_000 });
        const { profile } = await client.send("Profiler.stop");
        walls[key].push(await page.evaluate(() => window.__hydrateMs as number));
        const h = attributeProfile(profile, map, "entry.js");
        for (const k of Object.keys(hits[key]) as (keyof Hits)[]) hits[key][k] += h[k];
        await page.close();
      }
    }
    const out: Record<string, AttributionSample[]> = {};
    for (const key of Object.keys(walls)) out[key] = [splitByHits(median(walls[key]), hits[key])];
    return out;
  });
}
// inp-attribution: hydrate normally, then profile a LOOP of in-place re-renders (window.__inp,
// each a flushSync re-render + paint) and split the median click→paint wall by package.
async function inpAttrTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, AttributionSample[]>> {
  return withAttrServer(tech, ssrMod, async (browser, port, map) => {
    const out: Record<string, AttributionSample[]> = {};
    for (const cell of cells) {
      const n = caseMeta[cell.caseId].n;
      const page = await browser.newPage(PAGE_OPTS);
      const client = await page.context().newCDPSession(page);
      await page.goto(`http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.__inp !== undefined && window.__hydrateMs !== undefined, null, { timeout: 30_000 });
      for (let w = 0; w < 3; w++) await page.evaluate(() => window.__inp!()); // warmup, discarded
      const S = samplesFor("inp-attribution");
      const walls: number[] = [];
      for (let s = 0; s < S; s++) walls.push(await page.evaluate(() => window.__inp!()));
      await client.send("Profiler.enable");
      await client.send("Profiler.setSamplingInterval", { interval: 50 });
      await client.send("Profiler.start");
      for (let k = 0; k < S; k++) await page.evaluate(() => window.__inp!());
      const { profile } = await client.send("Profiler.stop");
      await page.close();
      out[`${cell.caseId}/${tech}`] = [splitByHits(median(walls), attributeProfile(profile, map, "entry.js"))];
    }
    return out;
  });
}
// mount-attribution: serve a BLANK root, profile the SINGLE cold-mount commit (window.__mount,
// triggered after the profiler starts), and split the median mount wall by package — the
// browser counterpart that shows where a runtime lib's first client-side style injection lands.
async function mountAttrTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, AttributionSample[]>> {
  return withAttrServer(tech, ssrMod, async (browser, port, map) => {
    type Hits = { react: number; lib: number; component: number; other: number };
    const S = samplesFor("mount-attribution");
    const walls: Record<string, number[]> = {};
    const hits: Record<string, Hits> = {};
    for (const c of cells) {
      const k = `${c.caseId}/${tech}`;
      walls[k] = [];
      hits[k] = { react: 0, lib: 0, component: 0, other: 0 };
    }
    // Round-robin across cells; r = -1 is a discarded warmup mount (no profiler) to warm
    // the code cache so the profiled samples aren't skewed by cold compile.
    for (let r = -1; r < S; r++) {
      for (const cell of cells) {
        const n = caseMeta[cell.caseId].n;
        const key = `${cell.caseId}/${tech}`;
        const page = await browser.newPage(PAGE_OPTS);
        const client = await page.context().newCDPSession(page);
        await page.goto(`http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}&mount=1`, { waitUntil: "load" });
        await page.waitForFunction(() => typeof window.__mount === "function", null, { timeout: 30_000 });
        if (r < 0) {
          await page.evaluate(() => window.__mount!());
          await page.waitForFunction(() => window.__mountMs !== undefined, null, { timeout: 30_000 });
          await page.close();
          continue;
        }
        await client.send("Profiler.enable");
        await client.send("Profiler.setSamplingInterval", { interval: 50 });
        await client.send("Profiler.start");
        await page.evaluate(() => window.__mount!());
        await page.waitForFunction(() => window.__mountMs !== undefined, null, { timeout: 30_000 });
        const { profile } = await client.send("Profiler.stop");
        walls[key].push(await page.evaluate(() => window.__mountMs as number));
        const h = attributeProfile(profile, map, "entry.js");
        for (const k of Object.keys(hits[key]) as (keyof Hits)[]) hits[key][k] += h[k];
        await page.close();
      }
    }
    const out: Record<string, AttributionSample[]> = {};
    for (const key of Object.keys(walls)) out[key] = [splitByHits(median(walls[key]), hits[key])];
    return out;
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

// ---- render-timing: browser render-work (style-recalc / layout / paint / forced) on a cold mount ----
// wpd (@jantimon/web-performance-debugger) drives its OWN Puppeteer browser against the shared
// hydrate server, so the in-process server MUST stay responsive → async exec, never execFileSync
// (a sync child would block the event loop and the server couldn't answer wpd's navigation).
// Chrome yields comparable exact counts; Firefox yields Gecko marker counts + sampled reflow/style
// ms. Gecko counts are useful diagnostics but are not comparable to Blink's batching semantics.
// Opt-in: needs `pnpm setup:wpd` (vendors wpd + browsers); skips gracefully when absent.
function toMetrics(summary: unknown): RenderTimingMetrics {
  const s = (summary ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  // wpd 0.6 digest.summary.perStep carries the "mount" step's raw wall samples — one per timed
  // `--iterations` loop (counts are pinned to the first timed iteration by wpd, so they do not
  // scale). Take the MEDIAN (wpd's own StepIndexEntry.wallMs convention; matches gen's medians),
  // falling back to the run-level summary.wallMs. NB: this is wpd's NODE-SIDE step wall — it
  // brackets the whole page.evaluate + settle, so it runs larger than an in-page interaction time.
  const perStep = (Array.isArray(s.perStep) ? s.perStep : []) as { label?: string; perIteration?: number[] }[];
  const step = perStep.find((x) => x?.label === "mount") ?? perStep[0];
  const iters = Array.isArray(step?.perIteration) ? step.perIteration.filter((n): n is number => typeof n === "number") : [];
  const stepMs = iters.length ? Math.round(median(iters) * 100) / 100 : num(s.wallMs);
  return {
    stepMs,
    layoutCount: num(s.layoutCount), layoutMs: num(s.layoutMs),
    styleCount: num(s.styleCount), styleMs: num(s.styleMs),
    paintCount: num(s.paintCount), paintMs: num(s.paintMs),
    // Removed by WPD 0.6 because committed-frame counts tracked settle duration, not page work.
    compositeCount: null, compositeMs: null,
    forcedLayoutCount: num(s.forcedLayoutCount), forcedLayoutMs: num(s.forcedLayoutMs),
    longTaskCount: num(s.longTaskCount),
  };
}

async function renderTimingTech(tech: string, ssrMod: SsrModule, cells: Cell[], caseMeta: Record<string, CaseMeta>): Promise<Record<string, RenderTimingSample[]>> {
  const cfg = benchConfig.renderTiming;
  if (!existsSync(WPD_BIN)) {
    console.warn(`  ⏭ render-timing: vendor/wpd missing — run \`pnpm setup:wpd\` first (skipped ${tech}).`);
    return {};
  }
  const recDir = join(os.tmpdir(), "wpd-bench");
  mkdirSync(recDir, { recursive: true });
  const runWpd = (args: string[], env: Record<string, string> = {}) =>
    execFileP(WPD_BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 128 * 1024 * 1024 });
  let firefoxOk = cfg.browsers.includes("firefox"); // detect a broken/absent firefox once, then chrome-only

  const { port, close } = await serveHydrate(tech, ssrMod);
  const out: Record<string, RenderTimingSample[]> = {};
  try {
    for (const cell of cells) {
      const url = `http://127.0.0.1:${port}/?case=${cell.caseId}&n=${cfg.n}&mount=1`;
      const sample: RenderTimingSample = { n: cfg.n };
      for (const browser of cfg.browsers) {
        if (browser === "firefox" && !firefoxOk) continue;
        const rec = join(recDir, `${tech}__${cell.caseId}__${browser}.json`);
        // WPD 0.6 supports --protocol-timeout on both browser targets. --no-cpu-profile remains
        // Chrome-only; Firefox needs its profiler for rendering markers and attribution.
        const args = ["record", WPD_FLOW, "--url", url, "--target", browser, "--settle", String(cfg.settleMs),
          "--warmup", String(cfg.warmup), "--iterations", String(cfg.iterations),
          "--protocol-timeout", String(cfg.protocolTimeoutMs), "--out", rec];
        if (browser === "chrome") args.push("--headless-mode", "shell", "--no-cpu-profile");
        // Firefox's first `session.new` per process flakes under load (times out); a fresh spawn usually
        // succeeds. Retry once before latching firefoxOk=false, so one cold-launch flake doesn't drop a
        // whole tech to chrome-only. wpd exposes no firefox-applicable launch-timeout flag (see feedback).
        for (let attempt = 0; ; attempt++) {
          try {
            await runWpd(args, { WPD_FLOW: "mount" });
            // `query index` needs the sidecar <name>.index.json; `query digest` already carries
            // per-step wall samples + the iteration-1 counts, so one digest query is enough.
            const digest = JSON.parse((await runWpd(["query", "digest", rec, "--json"])).stdout);
            sample[browser as "chrome" | "firefox"] = toMetrics(digest.summary);
            break;
          } catch (e) {
            const msg = (((e as { stderr?: string }).stderr || (e as Error).message) ?? "").toString().split("\n")[0];
            if (attempt === 0) {
              console.warn(`  ↻ render-timing ${tech} · ${cell.caseId} · ${browser} retry (${msg})`);
              continue;
            }
            if (browser === "firefox") {
              firefoxOk = false; // e.g. wrong pinned build — see `pnpm setup:wpd --force`
              console.warn(`  ⏭ render-timing firefox unavailable (${msg}) — chrome-only from here.`);
            } else {
              console.error(`  ✗ ${tech} · render-timing · ${cell.caseId} · ${browser}: ${msg}`);
            }
            break;
          }
        }
      }
      out[`${cell.caseId}/${tech}`] = [sample];
    }
  } finally {
    await close();
    rmSync(recDir, { recursive: true, force: true });
  }
  return out;
}

// ---- main ----------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const measurements = (args.measure ? (args.measure.split(",").map((s) => s.trim()) as Measurement[]) : DEFAULT_MEASUREMENTS).filter((m) =>
    ALL_MEASUREMENTS.includes(m),
  );
  const { techs, cases, cells } = discover(args);
  if (!cells.length) {
    console.error("no cells matched (techs/<t>/case/<c>/index.tsx). Check --tech/--case globs.");
    process.exit(1);
  }
  // Result files MERGE per cell, so a filtered (--tech/--case) or partial-measure run
  // never drops the cells it isn't regenerating — and a default run can't nuke heavy
  // autocannon/attribution data produced by a separate `--measure=…` run. An unfiltered
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
      snapshots[`${cell.caseId}/${tech}`] = { tsx: readFileSync(cell.entry, "utf8"), html, css };
    }

    for (const measurement of measurements) {
      const file = join(RESULT_DIR, `measurement-${measurement}.json`);
      const data: Record<string, unknown[]> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
      // hydrate(-attribution) + inp(-attribution) + mount(-attribution) + screenshots are browser passes over the SSR markup.
      const browserFns = { hydrate: hydrateTech, "hydrate-attribution": hydrateAttrTech, inp: inpTech, "inp-attribution": inpAttrTech, mount: mountTech, "mount-attribution": mountAttrTech, "render-timing": renderTimingTech, screenshots: screenshotTech } as const;
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
        else if (measurement === "attribution") data[key] = await attributionSample(tech, mod, cell.caseId, n);
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
  const meta: RunMeta = { host: os.hostname(), node: process.version, timestamp: new Date().toISOString(), gitSha, techs: allTechs, cases: allCases };
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
