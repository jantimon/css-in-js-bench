import { test } from "node:test";
import assert from "node:assert/strict";
import type { CpuOverview, SpanAnatomy, SpanTiming } from "@jantimon/web-performance-debugger";
import { runTiming, timingMedian, actionTiming, profileSpan, cpuPackageTimes, forcedSites } from "./wpd-query.ts";

const runSeries = (samplesMs: number[]): SpanTiming => ({
  sampleUnit: "iteration", boundary: "run-call", clock: "page", samplesMs, stats: null,
});
const anatomy = (fields: Partial<SpanAnatomy>): SpanAnatomy => ({
  kind: "run", label: "run", timing: null, wallMs: 900, ...fields,
} as SpanAnatomy);

test("SSR median uses captured call durations, including the midpoint for even counts", () => {
  const run = anatomy({ timing: runSeries([8, 2, 6, 4]) });
  const timing = runTiming(run, 4);
  assert.equal(timingMedian(timing), 5);
  assert.deepEqual(timing.samplesMs, [8, 2, 6, 4]);
  for (const timing of [null, runSeries([]), runSeries([1, Number.NaN]), runSeries([1, -1]), runSeries([1])]) {
    assert.throws(() => runTiming(anatomy({ timing }), 2), /measured run-call samples/);
  }
  assert.throws(() => runTiming(anatomy({ kind: "step", timing: runSeries([1, 2]) }), 2));
});

test("interaction diagnostics require the named action series, excluding outer run reset time", () => {
  const outer = anatomy({ timing: runSeries([180, 170, 175]) });
  const timing: SpanTiming = {
    sampleUnit: "occurrence", boundary: "performance-measure", clock: "trace",
    samplesMs: [20, 10, 15], stats: { samples: 3, minMs: 10, medianMs: 15, meanMs: 15, maxMs: 20 },
  };
  const action = anatomy({ kind: "measure", label: "inp:frame", wallMs: 15, timing });
  assert.deepEqual(actionTiming(action, 3), timing);
  assert.throws(() => actionTiming(outer, 3), /named measure/);
  assert.throws(() => actionTiming(anatomy({ kind: "measure", timing: outer.timing }), 3));
  assert.throws(() => actionTiming(action, 5));
  assert.equal(actionTiming(anatomy({ kind: "measure" })), null);
  assert.throws(() => actionTiming(anatomy({ kind: "measure" }), 5));
});

test("profile bars retain their own window and do not turn unmeasured paint into zero", () => {
  const span = anatomy({
    kind: "step", wallMs: 12, windowMs: 9,
    slices: {
      js: { ms: 4, byPackage: { app: 4 } }, style: { ms: 0 }, layout: { ms: 1 },
      paint: null, gc: { ms: 0 }, other: { ms: 1 }, idle: { ms: 3 },
    },
  });
  const profile = profileSpan(span)!;
  assert.equal(profile.wallMs, 9);
  assert.equal(profile.slices.paint, null);
  assert.equal(profile.slices.style, 0);
  assert.deepEqual(profile.jsByPackage, { app: 4 });
  assert.equal(profileSpan(anatomy({ slices: null })), null);
});

test("CPU package diagnostics read public self-time rows, independently of sampled total", () => {
  const cpu = { totalMs: 900, jsSelfMs: 12, byPackage: [
    { key: "react-dom", selfMs: 8, selfPct: 2 / 3 * 100 },
    { key: "app", selfMs: 4, selfPct: 1 / 3 * 100 },
  ] } as CpuOverview;
  assert.deepEqual(cpuPackageTimes(cpu), { "react-dom": 8, app: 4 });
});

test("forced sites use public source, line, and column fields", () => {
  assert.deepEqual(forcedSites([
    { source: "app.ts", line: 12, column: 3, count: 2, durMs: 1.25 },
    { source: "native", count: 1, durMs: 0 },
  ], 2), [
    { at: "app.ts:12:3", count: 2, durMs: 1.25 },
    { at: "native", count: 1, durMs: 0 },
  ]);
});
