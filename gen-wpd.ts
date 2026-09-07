// WPD records SSR call timings and CPU attribution, Chrome mount/hydration/interaction
// profiles, and Firefox rendering work. Named measures bound the browser actions;
// repeated action durations stay separate from each selected profile bar.
// Mount uses separate breakdown and deep passes of the same workload. Its run group
// supplies run-scoped counts and forced sites; the action bar uses mount:frame.
// --variant identifies each technology for WPD's workload compatibility checks.
// Results and their manifest go to result/ or WPD_RESULT_DIR.
import { build } from "vite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serveBrowserFixture } from "./scripts/browser-fixture.ts";
import { validateBrowserFixture } from "./scripts/browser-validation.ts";
import { chromium } from "@playwright/test";
import os from "node:os";
import benchConfig from "./bench.config.ts";
import type { CpuOverview, SpanAnatomy, SpanTiming, GroupSpanStitch } from "@jantimon/web-performance-debugger";
import { runTiming, timingMedian, actionTiming, profileSpan, cpuPackageTimes, forcedSites } from "./scripts/wpd-query.ts";
import type { CaseMeta, SsrModule, WpdSpanSample } from "./report/types.ts";
import { INTERACTION_PROTOCOL } from "./report/types.ts";
import { WPD_MANIFEST, writeJsonAtomic, type WpdManifest, type WpdLane } from "./report/wpd-results.ts";

const execFileP = promisify(execFile);
process.env.NODE_ENV = "production"; // load-bearing, same reason as gen.ts:33-39

const ROOT = dirname(fileURLToPath(import.meta.url));
const TECHS_DIR = join(ROOT, "techs");
const CASES_DIR = join(ROOT, "cases");
const RESULT_DIR = process.env.WPD_RESULT_DIR ?? join(ROOT, "result");
// Keep WPD + its heavyweight browser downloads isolated from the normal workspace install.
// `pnpm setup:wpd` creates this pinned vendor tree.
const WPD_BIN = join(ROOT, "vendor", "wpd", "node_modules", ".bin", "wpd");
const WPD_PACKAGE = join(ROOT, "vendor", "wpd", "node_modules", "@jantimon", "web-performance-debugger", "package.json");
const PUPPETEER_REVISIONS = join(ROOT, "vendor", "wpd", "node_modules", "puppeteer-core", "lib", "puppeteer", "revisions.js");
const BENCH_FLOW = join(ROOT, "scripts", "wpd", "bench-flow.mjs");
const NODE_ENTRY = join(ROOT, "scripts", "wpd", "node-ssr-entry.mjs");
const TMP = mkdtempSync(join(os.tmpdir(), "wpd-bench-gen-"));

// ---- tiny CLI (mirrors gen.ts) -------------------------------------------------
function parseArgs(argv: string[]) {
  const out: { lane?: string; tech?: string; case?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--lane=")) out.lane = arg.slice("--lane=".length);
    else if (arg === "--lane") out.lane = argv[++i];
    else if (arg.startsWith("--tech=")) out.tech = arg.slice("--tech=".length);
    else if (arg === "--tech") out.tech = argv[++i];
    else if (arg.startsWith("--case=")) out.case = arg.slice("--case=".length);
    else if (arg === "--case") out.case = argv[++i];
  }
  return out;
}
const globToRe = (glob: string) => new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
const matches = (glob: string | undefined, name: string) => !glob || globToRe(glob).test(name);
const dirsIn = (path: string) => (existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : []);
const round = (value: number, places = 3) => Math.round(value * 10 ** places) / 10 ** places;

interface Cell { tech: string; caseId: string; entry: string }
function discover(args: ReturnType<typeof parseArgs>) {
  const techs = dirsIn(TECHS_DIR).filter((tech) => existsSync(join(TECHS_DIR, tech, "package.json"))).filter((tech) => matches(args.tech, tech));
  const cases = readdirSync(CASES_DIR).filter((file) => file.endsWith(".ts")).map((file) => file.replace(/\.ts$/, "")).filter((caseId) => matches(args.case, caseId));
  const cells: Cell[] = [];
  for (const tech of techs) for (const caseId of cases) {
    const entry = join(TECHS_DIR, tech, "case", caseId, "index.tsx");
    if (existsSync(entry)) cells.push({ tech, caseId, entry });
  }
  return { techs, cases, cells };
}

// ---- vite build helpers --------------------------------------------------------
async function loadViteConfig(configPath: string) {
  let cfg = (await import(pathToFileURL(configPath).href + `?t=${Date.now()}`)).default;
  if (typeof cfg === "function") cfg = cfg();
  return await cfg;
}
async function buildMicrobench(tech: string): Promise<SsrModule> {
  const cfg = await loadViteConfig(join(TECHS_DIR, tech, "vite.microbench.config.ts"));
  await build({ ...cfg, configFile: false, logLevel: "warn" });
  const out = join(TECHS_DIR, tech, "dist", "microbench", "entry.mjs");
  if (!existsSync(out)) throw new Error(`${tech}: microbench build produced no entry.mjs`);
  return (await import(pathToFileURL(out).href + `?t=${Date.now()}`)) as SsrModule;
}
// Un-minified + sourcemapped hydrate bundle so wpd can split the js slice per package (the
// production hydrate build is minified with no map; a minified single bundle would collapse to one
// origin bucket). Same trick gen's *-attribution passes use (gen.ts:470-483).
async function buildHydrateBreakdown(tech: string): Promise<string> {
  const cfg = await loadViteConfig(join(TECHS_DIR, tech, "vite.hydrate.config.ts"));
  const merged = { ...cfg, build: { ...cfg.build, outDir: "dist/hydrate-bd", minify: false, sourcemap: true } };
  await build({ ...merged, configFile: false, logLevel: "warn" });
  const bundle = join(TECHS_DIR, tech, "dist", "hydrate-bd", "entry.js");
  if (!existsSync(bundle)) throw new Error(`${tech}: hydrate-bd build produced no entry.js`);
  return join(TECHS_DIR, tech, "dist", "hydrate-bd");
}

// ---- wpd runner ----------------------------------------------------------------
const runWpd = (args: string[], env: Record<string, string> = {}) =>
  execFileP(WPD_BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024 });
const errLine = (error: unknown) => (((error as { stderr?: string }).stderr || (error as Error).message) ?? "").toString().split("\n").filter(Boolean).slice(-1)[0] ?? "";

// ---- SSR bucket remap: wpd packages → the report's react/lib/component/other -----
// gen's bucketFor (gen.ts:263-271) keyed on the sourcemap source path; wpd already resolved every
// frame to an owning package, so we remap by package NAME instead. Same four buckets, so the report's
// AttributionChart consumes it unchanged.
//
// wpd names a frame's package by the nearest package.json, so a lane's case/component code under
// techs/<tech> resolves to that tech's WORKSPACE package name (its dir name), and the compiled/
// transformed bundle to wpd's generic first-party buckets `app` / `css-in-js-bench`. A workspace
// name only counts as `component` when it does NOT collide with a runtime styling-library npm name:
// for cn / cnfast / goober / next-yak / styled-components / tailwind-merge the workspace package is named
// after the library it benchmarks, so that key IS the library runtime (measured on the SSR data),
// and first-party for those lanes lands on `app` instead. Those names therefore stay in `lib`.
const COMPONENT_PACKAGES = new Set([
  "app", "css-in-js-bench", // wpd's generic first-party bundle buckets
  "emotion", // lib is @emotion/*
  "stylex", "stylex-layers", "stylex-solid", // lib is @stylexjs/stylex
  "panda", "panda-props", "panda-recipe", // lib is @pandacss/dev (+ generated styled-system)
  "bamboo", // lib is @bamboocss/* (+ generated styled-system)
  "next-yak-css", // lib is next-yak (no npm package named next-yak-css)
  "yak-solid", "yak-solid-nofold", // lib is @yak/solid (no npm package named yak-solid)
  "cn-solid", // lib is cn (no npm package named cn-solid)
  "vanilla", "vanilla-solid", // no styling library
]);
function bucketForPackage(pkg: string): "react" | "lib" | "component" | "other" {
  // The `react` bucket is the UI FRAMEWORK's own self-time — the floor every lane of
  // that framework shares. For the Solid lanes that floor is solid-js + @solidjs/*.
  if (/^(react-dom|react|scheduler|react-is)$/.test(pkg)) return "react";
  if (/^(solid-js|@solidjs\/.+)$/.test(pkg)) return "react";
  if (COMPONENT_PACKAGES.has(pkg)) return "component";
  if (/^\(node\)|^\(native\)|^\(program\)|^\(gc\)/.test(pkg)) return "other";
  // Every real styling package (@emotion/*, goober, stylis, styled-system, ...) AND wpd's
  // `(unmapped: <dir>)` buckets. next-yak ships published sourcemaps whose runtime/internals
  // originals are off-disk here, so wpd cannot name their node_modules package and buckets them as
  // `(unmapped: runtime)` / `(unmapped: internals)`. That cost is next-yak's own library runtime, so
  // it belongs in `lib` -- and it must NOT be blamed on the user's component. (wpd used to fold it
  // into `app`, which this remap read as `component`; wpd now keeps it out of `app`, so the
  // fallthrough here is what routes it correctly.) The only unmapped buckets this bench produces are
  // next-yak's, so the fallthrough is load-bearing, not a catch-all to tighten.
  return "lib";
}

interface SsrResult {
  renderMs: number; react: number; lib: number; component: number; other: number;
  byPackage: Record<string, number>;
  breakdown: { js: number; gc: number; browser: number; idle: number };
  perIteration: number[];
}
async function ssrLane(tech: string, mod: SsrModule, cell: Cell, caseMeta: Record<string, CaseMeta>): Promise<SsrResult> {
  const n = caseMeta[cell.caseId].n;
  const moduleAbs = join(TECHS_DIR, tech, "dist", "microbench", "entry.mjs");
  const iterations = 30;
  const rec = join(TMP, `ssr__${tech}__${cell.caseId}.json`);
  await runWpd(["record", NODE_ENTRY, "--target", "node", "--variant", tech, "--iterations", String(iterations), "--warmup", "5", "--out", rec],
    { WPD_SSR_MODULE: moduleAbs, WPD_CASE: cell.caseId, WPD_N: String(n) });
  const cpu = JSON.parse((await runWpd(["query", "cpu", rec, "--by", "package", "--format", "json"])).stdout) as CpuOverview;
  const timing = runTiming(await queryAnatomy(rec, "run"), iterations);
  const perIteration = timing.samplesMs;
  const renderMs = round(timingMedian(timing));
  const byPackage = cpuPackageTimes(cpu);
  const buckets = { react: 0, lib: 0, component: 0, other: 0 };
  for (const [pkg, ms] of Object.entries(byPackage)) buckets[bucketForPackage(pkg)] += ms as number;
  const totalJs = buckets.react + buckets.lib + buckets.component + buckets.other || 1;
  const part = (ms: number) => round((renderMs * ms) / totalJs);
  return {
    renderMs, react: part(buckets.react), lib: part(buckets.lib), component: part(buckets.component), other: part(buckets.other),
    byPackage: Object.fromEntries(Object.entries(byPackage).map(([pkg, ms]) => [pkg, round(ms as number)])),
    breakdown: {
      js: round(cpu.breakdown?.slices?.js?.ms ?? 0), gc: round(cpu.breakdown?.slices?.gc?.ms ?? 0),
      browser: round(cpu.breakdown?.slices?.browser?.ms ?? 0), idle: round(cpu.breakdown?.slices?.idle?.ms ?? 0),
    },
    perIteration,
  };
}

// ---- public span queries -------------------------------------------------------
type SpanResult = WpdSpanSample;
async function queryAnatomy(rec: string, selector: string): Promise<SpanAnatomy> {
  return JSON.parse((await runWpd(["query", "span", rec, selector, "--format", "json"])).stdout) as SpanAnatomy;
}
async function querySpan(rec: string, selector: string): Promise<SpanResult | null> {
  return profileSpan(await queryAnatomy(rec, selector));
}

async function breakdownLane(phase: "hydrate" | "inp", tech: string, port: number, cell: Cell): Promise<{ span: SpanResult | null; runSpan: SpanResult | null; timing: SpanTiming | null }> {
  const n = benchConfig.wpd.n;
  const mode = phase === "hydrate" ? "&manual=1" : "";
  const base = `?case=${cell.caseId}&n=${n}${mode}`;
  const url = `http://127.0.0.1:${port}/${base}&phase=${phase}`;
  const rec = join(TMP, `${phase}__${tech}__${cell.caseId}.json`);
  const iterations = phase === "inp" ? 5 : 1; // hydrate is single-shot; inp repeats one warm input change
  await runWpd(["record", BENCH_FLOW, "--bench", "--url", url, "--breakdown", "--variant", tech,
    "--protocol-timeout", String(benchConfig.wpd.protocolTimeoutMs), "--iterations", String(iterations),
    "--warmup", "0", "--out", rec]);
  const action = await queryAnatomy(rec, `measure:${phase}:frame`);
  return {
    span: profileSpan(action),
    runSpan: phase === "inp" ? null : await querySpan(rec, "run"),
    timing: actionTiming(action, phase === "inp" ? iterations : undefined),
  };
}

interface FirefoxResult {
  wallMs: number | null;
  breakdown: { js: number; style: number | null; layout: number | null; browser: number; gc: number; idle: number } | null;
  jsByPackage: Record<string, number>;
  forced: { at: string; count: number; durMs: number }[];
  counts: { layout: number | null; style: number | null; forcedLayout: number | null; paint: number | null };
  note?: string;
}
async function firefoxLane(phase: "mount" | "inp", tech: string, port: number, cell: Cell): Promise<FirefoxResult> {
  const n = benchConfig.wpd.n;
  const base = phase === "mount" ? `?case=${cell.caseId}&n=${n}&mount=1` : `?case=${cell.caseId}&n=${n}`;
  const url = `http://127.0.0.1:${port}/${base}&phase=${phase}`;
  const rec = join(TMP, `firefox__${tech}__${cell.caseId}.json`);
  const args = ["record", BENCH_FLOW, "--bench", "--url", url, "--target", "firefox", "--variant", tech,
    "--protocol-timeout", String(benchConfig.wpd.protocolTimeoutMs), "--iterations", "1", "--warmup", "0",
    "--out", rec];
  try {
    await runWpd(args);
  } catch (firstError) {
    console.warn(`  ↻ firefox ${cell.caseId}/${tech}: retrying once (${errLine(firstError)})`);
    await runWpd(args);
  }
  const span = await querySpan(rec, `measure:${phase}:frame`);
  const run = await queryAnatomy(rec, "run");
  const forced = forcedSites(run.forced ?? [], 8);
  const counts = run.counts;
  return {
    wallMs: span?.wallMs ?? null,
    breakdown: span ? {
      js: span.slices.js, style: span.slices.style, layout: span.slices.layout,
      browser: span.slices.other, gc: span.slices.gc, idle: span.slices.idle,
    } : null,
    jsByPackage: span?.jsByPackage ?? {},
    forced,
    counts: {
      layout: counts.layoutCount,
      style: counts.styleCount,
      forcedLayout: counts.forcedLayoutCount,
      paint: counts.paintCount,
    },
  };
}

interface BlameResult {
  forced: { at: string; count: number; durMs: number }[];
  forcedLayoutCount: number | null;
  layoutCount: number | null;
  styleCount: number | null;
  paintCount: number | null;
  forcedLayoutMs: number | null;
  layoutMs: number | null;
  styleMs: number | null;
  paintMs: number | null;
}

// The group supplies run-scoped durations from breakdown and counts/forced sites
// from a separate deep pass of the same workload. The mount bar uses mount:frame.
// Deep capture does not measure forced-layout duration, so that value stays null.
async function mountRenderTimingLane(tech: string, port: number, cell: Cell): Promise<{
  mount: { span: SpanResult | null; runSpan: SpanResult | null; timing: SpanTiming | null };
  blame: BlameResult;
}> {
  const n = benchConfig.wpd.n;
  const url = `http://127.0.0.1:${port}/?case=${cell.caseId}&n=${n}&mount=1&phase=mount`;
  const groupName = `rt__${tech}__${cell.caseId}`;
  const groupBase = join(TMP, groupName);
  await runWpd(["record", BENCH_FLOW, "--bench", "--url", url, "--members", "breakdown,deep", "--group", groupName,
    "--variant", tech, "--protocol-timeout", String(benchConfig.wpd.protocolTimeoutMs),
    "--iterations", "1", "--warmup", "0", "--out", groupBase]);

  const breakdownRec = `${groupBase}.breakdown.json`;
  const manifest = `${groupBase}.group.json`;
  const action = await queryAnatomy(breakdownRec, "measure:mount:frame");
  const mount = {
    span: profileSpan(action),
    runSpan: await querySpan(breakdownRec, "run"),
    timing: actionTiming(action),
  };

  const stitch = JSON.parse((await runWpd(["query", "span", manifest, "run", "--json"])).stdout) as GroupSpanStitch;
  const counts = stitch.counts ?? {};
  const num = (value: unknown): number | null => (typeof value === "number" ? value : null);
  const sliceMs = (slice: { ms?: number } | null | undefined): number | null => (typeof slice?.ms === "number" ? round(slice.ms) : null);
  const forced = forcedSites(stitch.forced ?? [], 10);
  const blame: BlameResult = {
    forced,
    forcedLayoutCount: num(counts.forcedLayoutCount),
    layoutCount: num(counts.layoutCount),
    styleCount: num(counts.styleCount),
    paintCount: num(counts.paintCount),
    forcedLayoutMs: null, // --deep suppresses slice durations; forced ms is not measured here
    layoutMs: sliceMs(stitch.slices?.layout),
    styleMs: sliceMs(stitch.slices?.style),
    paintMs: sliceMs(stitch.slices?.paint),
  };
  return { mount, blame };
}

// ---- main ----------------------------------------------------------------------
type Lane = WpdLane;
// The `mount` lane records a run group (--members breakdown,deep) and emits BOTH the mount and the
// blame result files -- there is no independent `blame` lane. See mountRenderTimingLane.
const ALL_LANES: Lane[] = ["ssr", "mount", "hydrate", "inp", "firefox"];

function readResult(file: string): Record<string, unknown> {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}
function writeResult(file: string, data: Record<string, unknown>) {
  writeJsonAtomic(file, data);
}
function toolMeta() {
  const version = existsSync(WPD_PACKAGE) ? JSON.parse(readFileSync(WPD_PACKAGE, "utf8")).version : "unknown";
  const revisions = existsSync(PUPPETEER_REVISIONS) ? readFileSync(PUPPETEER_REVISIONS, "utf8") : "";
  const revision = (name: string) => revisions.match(new RegExp(`['\"]?${name}['\"]?\\s*:\\s*['\"]([^'\"]+)`))?.[1] ?? "unknown";
  // wpd always runs Chrome's built-in headless (the standalone shell mode is gone).
  return { version, headlessMode: "built-in", chrome: revision("chrome"), firefox: revision("firefox") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lanes = (args.lane ? args.lane.split(",").map((lane) => lane.trim()) as Lane[] : ALL_LANES).filter((lane) => ALL_LANES.includes(lane));
  const { cells } = discover(args);
  if (!cells.length) { console.error("no cells matched"); process.exit(1); }
  mkdirSync(RESULT_DIR, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  const techs = [...new Set(cells.map((cell) => cell.tech))];
  const caseMeta: Record<string, CaseMeta> = {};
  for (const caseId of [...new Set(cells.map((cell) => cell.caseId))]) caseMeta[caseId] = (await import(pathToFileURL(join(CASES_DIR, `${caseId}.ts`)).href)).default;

  const tally: Record<string, { run: number; ok: number; fail: number }> = {};
  for (const lane of lanes) tally[lane] = { run: 0, ok: 0, fail: 0 };
  const bump = (lane: Lane, ok: boolean) => { tally[lane].run++; ok ? tally[lane].ok++ : tally[lane].fail++; };

  const manifestFile = join(RESULT_DIR, WPD_MANIFEST);
  const runId = process.env.WPD_RUN_ID ?? `${new Date().toISOString()}-${process.pid}`;
  let gitSha = "";
  try { gitSha = (await execFileP("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" })).stdout.trim(); } catch {}
  const cpu = os.cpus();
  const manifest: WpdManifest = process.env.WPD_RUN_ID && existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, "utf8"))
    : {
      schemaVersion: 2, runId, complete: false, expectedCells: cells.length, lanes: {},
      // host describes the hardware, not the machine's network name (the report publishes it).
      environment: { gitSha, host: `${cpu[0]?.model ?? "unknown"} (${os.arch()})`, node: process.version, platform: os.platform(), release: os.release(), arch: os.arch(), cpuModel: cpu[0]?.model ?? "unknown", logicalCpus: cpu.length },
      wpd: toolMeta(), config: { n: benchConfig.wpd.n },
    };
  if (manifest.runId !== runId) throw new Error("WPD manifest belongs to another run");
  if (manifest.schemaVersion !== 2) throw new Error("WPD manifest has an incompatible result schema");
  if (manifest.expectedCells !== cells.length) throw new Error("WPD lane filters differ within one run");
  for (const lane of lanes) manifest.lanes[lane] = {
    run: 0, ok: 0, fail: 0, startedAt: new Date().toISOString(), finishedAt: "", loadAverageStart: os.loadavg(), loadAverageEnd: [],
  };
  writeJsonAtomic(manifestFile, manifest);

  const files: Record<Lane, string> = {
    ssr: join(RESULT_DIR, "measurement-wpd-ssr.json"), mount: join(RESULT_DIR, "measurement-wpd-mount.json"),
    hydrate: join(RESULT_DIR, "measurement-wpd-hydrate.json"),
    inp: join(RESULT_DIR, "measurement-wpd-inp.json"), firefox: join(RESULT_DIR, "measurement-wpd-firefox.json"),
  };
  const data: Record<Lane, Record<string, unknown>> = {
    ssr: readResult(files.ssr), mount: readResult(files.mount), hydrate: readResult(files.hydrate), inp: readResult(files.inp), firefox: readResult(files.firefox),
  };
  // The blame result file rides the `mount` lane (the deep member of its run group), not a lane of
  // its own, so it lives outside the lane-keyed maps above.
  const blameFile = join(RESULT_DIR, "measurement-wpd-blame.json");
  const blameData = readResult(blameFile);

  console.log(`gen-wpd: ${cells.length} cell(s), ${techs.length} tech(s), lanes: ${lanes.join(", ")}`);
  let firefoxOk = true;

  for (const tech of techs) {
    const techCells = cells.filter((cell) => cell.tech === tech);
    // Build the SSR module once (needed by ssr AND to render markup for the browser lanes' server).
    let mod: SsrModule;
    try { mod = await buildMicrobench(tech); }
    catch (error) { console.error(`  ✗ ${tech}: microbench build failed — ${errLine(error)}`); continue; }

    // ---- SSR node lane ----
    if (lanes.includes("ssr")) for (const cell of techCells) {
      const key = `${cell.caseId}/${tech}`;
      try { data.ssr[key] = [await ssrLane(tech, mod, cell, caseMeta)]; bump("ssr", true); console.log(`  ✓ ssr ${key}`); }
      catch (error) { bump("ssr", false); console.error(`  ✗ ssr ${key}: ${errLine(error)}`); }
      writeResult(files.ssr, data.ssr);
    }

    // ---- browser lanes share one build + one server ----
    const needsBrowser = lanes.some((lane) => lane !== "ssr");
    if (needsBrowser) {
      let directory: string;
      try { directory = await buildHydrateBreakdown(tech); }
      catch (error) { console.error(`  ✗ ${tech}: hydrate-bd build failed — ${errLine(error)}`); continue; }
      const { port, close } = await serveBrowserFixture({ directory, ssrMod: mod });
      try {
        // Correctness checks use separate pages before any profile recording.
        const browser = await chromium.launch();
        try {
          for (const cell of techCells) await validateBrowserFixture(browser, { port, ssrMod: mod, caseId: cell.caseId });
        } finally { await browser.close(); }
        for (const cell of techCells) {
          const key = `${cell.caseId}/${tech}`;
          if (lanes.includes("mount")) {
            try {
              const { mount: mountResult, blame } = await mountRenderTimingLane(tech, port, cell);
              const { span, runSpan, timing } = mountResult;
              data.mount[key] = [{ span, runSpan, timing }];
              blameData[key] = [blame];
              bump("mount", !!span);
              console.log(`  ${span ? "✓" : "∅"} mount ${key}${span ? ` (wall ${span.wallMs}ms, idle ${span.slices.idle}ms; layouts ${blame.layoutCount}, forced ${blame.forcedLayoutCount})` : ""}`);
              writeResult(files.mount, data.mount);
              writeResult(blameFile, blameData);
            } catch (error) { bump("mount", false); console.error(`  ✗ mount ${key}: ${errLine(error)}`); }
          }
          if (lanes.includes("hydrate")) {
            try { const { span, runSpan, timing } = await breakdownLane("hydrate", tech, port, cell); data.hydrate[key] = [{ span, runSpan, timing }]; bump("hydrate", !!span); console.log(`  ${span ? "✓" : "∅"} hydrate ${key}${span ? ` (wall ${span.wallMs}ms, idle ${span.slices.idle}ms)` : ""}`); writeResult(files.hydrate, data.hydrate); }
            catch (error) { bump("hydrate", false); console.error(`  ✗ hydrate ${key}: ${errLine(error)}`); }
          }
          if (lanes.includes("inp")) {
            try { const { span, runSpan, timing } = await breakdownLane("inp", tech, port, cell); data.inp[key] = [{ interactionProtocol: INTERACTION_PROTOCOL, span, runSpan, timing }]; bump("inp", !!span); console.log(`  ${span ? "✓" : "∅"} inp ${key}${span ? ` (wall ${span.wallMs}ms, js ${span.slices.js}ms, idle ${span.slices.idle}ms)` : ""}`); writeResult(files.inp, data.inp); }
            catch (error) { bump("inp", false); console.error(`  ✗ inp ${key}: ${errLine(error)}`); }
          }
          if (lanes.includes("firefox") && firefoxOk) {
            try { const result = await firefoxLane("mount", tech, port, cell); data.firefox[key] = [result]; bump("firefox", !!result.breakdown); console.log(`  ${result.breakdown ? "✓" : "∅"} firefox ${key}${result.breakdown ? ` (js ${result.breakdown.js}ms, style ${result.breakdown.style}ms, layout ${result.breakdown.layout}ms, idle ${result.breakdown.idle}ms)` : ""}`); writeResult(files.firefox, data.firefox); }
            catch (error) {
              bump("firefox", false);
              const line = errLine(error);
              console.error(`  ✗ firefox ${key}: ${line}`);
              if (/firefox|bidi|session/i.test(line)) { firefoxOk = false; console.error("  ⏭ firefox unavailable — skipping remaining firefox cells."); }
            }
          }
        }
      } finally { await close(); }
    }
  }

  console.log("\n=== tally ===");
  for (const lane of lanes) console.log(`  ${lane.padEnd(8)} run ${tally[lane].run}  ok ${tally[lane].ok}  fail ${tally[lane].fail}`);
  let failed = false;
  for (const lane of lanes) {
    const laneTally = tally[lane];
    manifest.lanes[lane] = {
      ...manifest.lanes[lane]!, ...laneTally, finishedAt: new Date().toISOString(), loadAverageEnd: os.loadavg(),
    };
    if (laneTally.fail !== 0 || laneTally.run !== cells.length || laneTally.ok !== cells.length) failed = true;
  }
  writeJsonAtomic(manifestFile, manifest);
  rmSync(TMP, { recursive: true, force: true });
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exit(1); });
