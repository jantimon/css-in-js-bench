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
  appStylesheet: "tailwind" | "panda" | "stylex" | "bamboo" | null;
  /** How this lane's CSS exists — drives the report legend. */
  cssKind: "extracted" | "atomic" | "utility" | "runtime" | "none";
  /** UI framework the lane renders with. Absent means React (the default for this
   * suite). A Solid lane is measured on the same workloads but against its own
   * framework floor — the marginal-JS subtraction and the attribution's framework
   * bucket both key on this. */
  framework?: "solid";
  /** Hidden by default in the report's lane filter (one click to show), left out of the
   * Key-findings panel. For diagnostic variants that matter to one library's maintainers
   * more than to a cross-library comparison, and for extreme outliers that would skew the
   * default view. */
  defaultOff?: boolean;
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

/** The same contract for the Solid lanes: the instance index arrives as an ACCESSOR.
 * Solid has no re-render, so an interaction is a value change flowing through the
 * reactive graph — the client entry drives this accessor from a signal. */
export type SolidRenderCase = (i: () => number) => unknown; // JSX.Element

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

/** Source extensions a case folder may hold, mapped to the Shiki grammar that highlights
 * them — `.ts` rides the tsx grammar (a superset), so no extra grammar has to be loaded.
 * Adding a file type is one entry here; anything not listed stops the build in gen.ts,
 * because a lane dropping a new kind of file should be a decision rather than a blank tab. */
export const SOURCE_EXT = { ".ts": "tsx", ".tsx": "tsx", ".css": "css" } as const;

/** One authored file of a case, shown as its own tab (§7). */
export interface SourceFile {
  name: string;
  code: string;
}

/** The displayed artifacts for one cell (§7): every authored file, plus the generated pair. */
export interface Snapshot {
  files: SourceFile[];
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
  react: number; // the UI framework's own self-time — react-dom + react + scheduler, or solid-js + @solidjs/* (the floor every lane of that framework shares)
  lib: number; // the styling library's own self-time
  component: number; // the case component + ssr-entry
  other: number; // node / native / gc
}

/**
 * render-timing: browser render-work on a cold mount, per engine, from wpd. Chrome's authoritative
 * axis is the *counts* (one style-recalc per runtime-injected instance); Firefox's is sampled Gecko
 * style/layout time plus target-specific marker counts. Paint is unmeasured in Firefox, and its
 * marker counts are not comparable to Blink's batching.
 */
export interface RenderTimingMetrics {
  layoutCount: number | null;
  layoutMs: number | null;
  styleCount: number | null;
  styleMs: number | null;
  paintCount: number | null;
  paintMs: number | null;
  forcedLayoutCount: number | null;
  forcedLayoutMs: number | null;
}

/** WPD's unified per-span browser breakdown, normalized by gen-wpd. */
export interface WpdSpanSample {
  wallMs: number;
  slices: { js: number; style: number; layout: number; paint: number; gc: number; other: number; idle: number };
  jsByPackage: Record<string, number>;
  frames?: { presented: number; presentedPartial: number; dropped: number; total: number; worstStages?: { name: string; ms: number }[] };
}

export interface WpdBrowserSample {
  span: WpdSpanSample | null;
  runSpan: WpdSpanSample | null;
  timing: {
    wallMs: number | null;
    perIteration: number[];
    stats: { samples: number; minMs: number; medianMs: number; meanMs: number; maxMs: number } | null;
  };
}

export interface WpdFirefoxSample {
  wallMs: number | null;
  breakdown: { js: number; style: number; layout: number; browser: number; gc: number; idle: number } | null;
  jsByPackage: Record<string, number>;
  forced: { at: string; count: number; durMs: number }[];
  counts: { layout: number | null; style: number | null; forcedLayout: number | null; paint: number | null };
}

export interface WpdBlameSample {
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
  /** Instances rendered into each snapshot html (bench.config snapshotN) — used to derive per-element costs. */
  snapshotN?: number;
}
