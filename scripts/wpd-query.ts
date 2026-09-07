import type { CpuOverview, SpanAnatomy, SpanForced, SpanTiming } from "@jantimon/web-performance-debugger";
import type { WpdSpanSample } from "../report/types.ts";

const validSamples = (timing: SpanTiming | null | undefined): timing is SpanTiming =>
  !!timing && Array.isArray(timing.samplesMs) && timing.samplesMs.length > 0 &&
  timing.samplesMs.every((value) => Number.isFinite(value) && value >= 0);

/** Require the recorded call durations; a sampled profile cannot supply missing timings. */
export function runTiming(span: SpanAnatomy, expectedSamples: number): SpanTiming {
  const timing = span.timing;
  if (span.kind !== "run" || !validSamples(timing) || timing.sampleUnit !== "iteration" ||
      timing.boundary !== "run-call" || timing.samplesMs.length !== expectedSamples) {
    throw new Error(`WPD run timing requires ${expectedSamples} measured run-call samples`);
  }
  return timing;
}

export function timingMedian(timing: SpanTiming): number {
  if (!validSamples(timing)) throw new Error("WPD timing has no valid sample series");
  const sorted = [...timing.samplesMs].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Action samples exclude setup outside the named measure; unrepeated measures have no series. */
export function actionTiming(span: SpanAnatomy, expectedSamples?: number): SpanTiming | null {
  const timing = span.timing;
  if (span.kind !== "measure") throw new Error("WPD action timing requires a named measure");
  if (timing == null && expectedSamples === undefined) return null;
  if (!validSamples(timing) || timing.sampleUnit !== "occurrence" || timing.boundary !== "performance-measure" ||
      (expectedSamples !== undefined && timing.samplesMs.length !== expectedSamples)) {
    throw new Error("WPD action timing requires the named measure's recorded occurrences");
  }
  return timing;
}

/** Keep the profile window and unmeasured slices distinct from timing samples. */
export function profileSpan(span: SpanAnatomy): WpdSpanSample | null {
  if (!span.slices) return null;
  const wallMs = span.windowMs ?? span.wallMs;
  if (wallMs == null || !Number.isFinite(wallMs)) return null;
  const slices = span.slices;
  return {
    wallMs,
    slices: {
      js: slices.js.ms, style: slices.style?.ms ?? null, layout: slices.layout?.ms ?? null,
      paint: slices.paint?.ms ?? null, gc: slices.gc.ms, other: slices.other.ms, idle: slices.idle.ms,
    },
    jsByPackage: { ...slices.js.byPackage },
    ...(span.frames ? { frames: {
      presented: span.frames.presented, presentedPartial: span.frames.presentedPartial,
      dropped: span.frames.dropped, total: span.frames.total, worstStages: span.frames.worstStages,
    } } : {}),
  };
}

export function cpuPackageTimes(cpu: CpuOverview): Record<string, number> {
  return Object.fromEntries(cpu.byPackage.map((entry) => [entry.key, entry.selfMs]));
}

export function forcedSites(rows: SpanForced[], limit: number) {
  return rows.slice(0, limit).map((row) => ({
    at: `${row.source}${row.line == null ? "" : `:${row.line}${row.column == null ? "" : `:${row.column}`}`}`,
    count: row.count,
    durMs: row.durMs,
  }));
}
