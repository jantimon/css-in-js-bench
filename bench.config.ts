// gen-owned sampling knobs ONLY (§8.3). The workload size `n` and cardinality
// live in cases/<id>.ts; presentation lives in the report. Nothing here is a
// per-tech or per-case override — it is the rigor of the measurement itself.
export default {
  warmup: 50, // discarded warmup renders before timing
  sampleCount: 7, // default measured samples per cell per run → raw array in result/
  snapshotN: 2, // instances rendered for the displayed HTML/CSS snapshot

  // Per-measurement sample-count overrides (fall back to `sampleCount`). The flakiest
  // passes take a fresh page PER sample, so a transient load spike over one cell's
  // contiguous block skews its median — gen samples these ROUND-ROBIN across cells (one
  // sample of every cell per round) AND takes more samples so the median is tight. inp /
  // inp-attribution load the page once and sample cheaply in place (already stable), so
  // they only get a small bump, no round-robin.
  samples: {
    // microbench is a cheap in-process SSR render (renderToString in node), so a high
    // sample count is nearly free and tightens the median well below single-digit-sample noise.
    microbench: 51,
    hydrate: 21,
    mount: 15,
    "hydrate-attribution": 13,
    "mount-attribution": 13,
    inp: 13,
    "inp-attribution": 11,
  } as Record<string, number>,

  // Heavy measurements (run via `gen --measure=…` on an idle machine).
  // autocannon: warmupRounds discarded (cold server JIT), then `rounds` measured rounds →
  // the report takes the median across measured rounds; longer duration stabilises each round.
  autocannon: { warmupRounds: 1, rounds: 5, durationSec: 8, connections: 10 }, // SSR req/s under load
  attribution: { loop: 8, iters: 25, warmup: 5 }, // SSR CPU self-time split
  nsweep: { ns: [100, 500, 1000, 2000, 4000], iters: 21 }, // render time vs instance count (median of iters)

  // The browser viewport for the Playwright passes (hydrate / inp / screenshots) — a
  // deliberate desktop size, not Playwright's implicit default. The SSR passes above don't
  // render to a screen at all (renderToString in node), so this only affects the browser
  // ones. Screenshots add their own deviceScaleFactor:2 for crisp images.
  browser: { width: 1280, height: 720, deviceScaleFactor: 1 },

  // render-timing: browser paint/layout/style-recalc work on a COLD MOUNT, measured by wpd
  // (@jantimon/web-performance-debugger) in Chrome (exact counts) + Firefox (Gecko reflow/style
  // ms). Heavy + opt-in — needs `pnpm setup:wpd` first, run via `gen --measure=render-timing`.
  // Traced instrumentation is expensive, so a FIXED small `n` (not the case's own n) keeps runs
  // tractable AND the counts comparable across cases (style-recalc count scales with instances).
  // Only `mount` has real render work — an idempotent inp re-render / SSR-inline hydrate do ~0.
  // wpd 0.5 measures a real DOM interaction more than once in one browser boot: `warmup` untimed
  // mounts drop the cold-JIT first sample, then `iterations` timed mounts give a median wall (counts
  // are pinned to the first timed iteration by wpd, so they do NOT scale with iterations).
  renderTiming: { browsers: ["chrome", "firefox"], n: 50, settleMs: 250, protocolTimeoutMs: 600_000, iterations: 7, warmup: 2 },
};
