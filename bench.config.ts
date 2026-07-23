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
  // sample of every cell per round) AND takes more samples so the median is tight. inp
  // loads the page once and samples cheaply in place (already stable), so
  // they only get a small bump, no round-robin.
  samples: {
    // microbench is a cheap in-process SSR render (renderToString in node), so a high
    // sample count is nearly free and tightens the median well below single-digit-sample noise.
    microbench: 51,
    hydrate: 21,
    mount: 15,
    inp: 13,
  } as Record<string, number>,

  // Heavy measurements (run via `gen --measure=…` on an idle machine).
  // autocannon: warmupRounds discarded (cold server JIT), then `rounds` measured rounds →
  // the report takes the median across measured rounds; longer duration stabilises each round.
  autocannon: { warmupRounds: 1, rounds: 5, durationSec: 8, connections: 10 }, // SSR req/s under load
  nsweep: { ns: [100, 500, 1000, 2000, 4000], iters: 21 }, // render time vs instance count (median of iters)

  // The browser viewport for the Playwright passes (hydrate / inp / screenshots) — a
  // deliberate desktop size, not Playwright's implicit default. The SSR passes above don't
  // render to a screen at all (renderToString in node), so this only affects the browser
  // ones. Screenshots add their own deviceScaleFactor:2 for crisp images.
  browser: { width: 1280, height: 720, deviceScaleFactor: 1 },

  // Browser and Node work measured by WPD. This is the canonical attribution and rendering
  // path; `pnpm gen:wpd` runs the lanes sequentially after `pnpm setup:wpd`.
  // Traced instrumentation is expensive, so a FIXED small `n` (not the case's own n) keeps runs
  // tractable AND the counts comparable across cases (style-recalc count scales with instances).
  // Only `mount` has real render work — an idempotent inp re-render / SSR-inline hydrate do ~0.
  wpd: { n: 50, protocolTimeoutMs: 600_000 },
};
