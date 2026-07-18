// Shared types for cases, tech metadata, and the result/ data format. Kept in
// report/ because the report is the only consumer that needs the full shape; gen
// imports the same types so the data it writes and the data the report reads can
// never drift.

/** A workload definition — `cases/<id>.ts` default-exports this (§5). */
export interface CaseMeta {
  /** Human label shown in the report. */
  label: string;
  /** Editorial grouping bucket id (the report decides how groups render/sort). */
  group: string;
  /** Instances rendered per measured pass — IDENTICAL for every tech (fairness). */
  n: number;
  /** Cache-hit vs cache-thrash character of the workload. */
  cardinality: "low" | "high" | "n/a";
  /** "what & why" prose. */
  description: string;
  note?: string;
}

/** The `bench` block inside each `techs/<tech>/package.json` (§4.1). */
export interface TechBench {
  /** Chart colour (hex). */
  color: string;
  /** Build plugin the lane needs — informational; real wiring is in vite configs. */
  buildPlugin: "yak" | "stylex" | null;
  /** Prebuilt stylesheet the app ships (presentation/legend hint). */
  appStylesheet: "tailwind" | "panda" | "stylex" | null;
  /** How this lane's CSS exists — drives the report legend. */
  cssKind: "extracted" | "atomic" | "utility" | "runtime" | "none";
}

/** Parsed `techs/<tech>/package.json` (the fields the suite cares about). */
export interface TechInfo {
  /** dirname === package.json name (§4.1). The data key. */
  name: string;
  /** Chart label — package.json `description` (npm names can't hold spaces/()). */
  label: string;
  bench: TechBench;
}

/** The render-function contract a `case/<id>/index.tsx` default-exports (§6). */
export type RenderCase = (i: number) => unknown; // ReactElement; unknown to avoid a react dep here

/** Uniform SSR entry every tech build exposes (§6.1). */
export type RenderCaseFn = (caseId: string, n: number) => { html: string; css: string };

/**
 * Optional hot-path render for the microbench: the production SSR work ONLY (no
 * snapshot/payload CSS collection). Build-time-CSS libs (tailwind JIT, panda slice)
 * MUST export this so the throughput timer measures rendering, not CSS extraction.
 * If absent, gen falls back to `renderCase(...).html`.
 */
export type RenderHtmlFn = (caseId: string, n: number) => string;

/** What a tech's built SSR entry exposes. */
export interface SsrModule {
  renderCase: RenderCaseFn;
  renderHtml?: RenderHtmlFn;
}

/** The three displayed artifacts for one cell (§7). */
export interface Snapshot {
  tsx: string;
  html: string;
  css: string;
}

/** Payload measurement's per-pass record (§9). */
export interface PayloadSample {
  js: number;
  css: number;
  html: number;
}

/** One point of the n-sweep: median render time (ms) at a given instance count. */
export interface NsweepSample {
  n: number;
  ms: number;
}

/** Attribution: the median SSR render split into per-bucket self-time (ms). */
export interface AttributionSample {
  renderMs: number;
  react: number; // react-dom + react + scheduler (the floor every lane shares)
  lib: number; // the styling library's own self-time
  component: number; // the case component + ssr-entry
  other: number; // node / native / gc
}

/**
 * render-timing: browser render-work on a cold mount, per engine, from wpd. Chrome's authoritative
 * axis is the *counts* (one style-recalc per runtime-injected instance); Firefox's is Gecko *ms*
 * (style/forced-layout reflow time). Counts/paint/INP are null in Firefox (no CDP) — the report
 * picks the right headline field per engine. `stepMs` is wpd's coarse per-interaction wall (single
 * sample, from wpd 0.5's labelled `summary.perStep`) — directional only, NOT a replacement for the
 * harness's timing medians.
 */
export interface RenderTimingMetrics {
  stepMs: number | null;
  layoutCount: number | null;
  layoutMs: number | null;
  styleCount: number | null;
  styleMs: number | null;
  paintCount: number | null;
  paintMs: number | null;
  compositeCount: number | null;
  compositeMs: number | null;
  forcedLayoutCount: number | null;
  forcedLayoutMs: number | null;
  longTaskCount: number | null;
}

/** One render-timing sample for a cell: the fixed instance count used + per-engine metrics. */
export interface RenderTimingSample {
  n: number;
  chrome?: RenderTimingMetrics;
  firefox?: RenderTimingMetrics;
}

/** result/meta.json (§9). */
export interface RunMeta {
  host: string;
  node: string;
  timestamp: string;
  gitSha: string;
  techs: string[];
  cases: string[];
  /** Browser builds used by the render-timing (wpd) pass, when it ran. */
  browsers?: { chrome?: string; firefox?: string };
}
