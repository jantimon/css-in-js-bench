import test from "node:test";
import assert from "node:assert/strict";
import { httpResults, httpMeasurementNote, HTTP_PROTOCOL, assertHttpCheckpointReady } from "./http-results.ts";
import { median } from "./stats.ts";

function fixture() {
  return {
    protocol: HTTP_PROTOCOL,
    workload: { caseId: "case", n: 50 }, generationId: "test-generation", scheduleSha256: "b".repeat(64),
    config: { rounds: 2, durationSec: 8, connections: 10, warmupRounds: 1, seed: 20260907 },
    moduleSha256: "a".repeat(64),
    scope: "rendered-html-fragment",
    rounds: [0, 10].map((average, index) => ({
      block: index + 1, serverPid: 100 + index, loadPid: 200 + index,
      startedAt: "2026-09-07T00:00:00Z", finishedAt: "2026-09-07T00:00:08Z",
      warmupResults: [{ requests: { average: 10 }, duration: 8, errors: 0, timeouts: 0, non2xx: 0, mismatches: 0 }],
      result: { requests: { average }, duration: 8, errors: 0, timeouts: 0, non2xx: 0, mismatches: 0,
        latency: { p99: 50 + index }, statusCodeStats: { 200: { count: 80 } } },
    })),
  };
}

test("isolated HTTP rates include measured zero and leave raw latency distributions intact", () => {
  const cell = fixture();
  const before = structuredClone(cell);
  const view = httpResults({ "case/lane": cell });
  assert.equal(view.protocol, HTTP_PROTOCOL);
  assert.deepEqual(view.samples, { "case/lane": [0, 10] });
  assert.equal(median(view.samples["case/lane"]), 5);
  assert.deepEqual(cell, before);
});

test("shared-process results remain viewable and cannot share a chart with isolated results", () => {
  assert.deepEqual(httpResults({ lane: [0, 2, 3] }), { samples: { lane: [0, 2, 3] }, protocol: "shared-process" });
  assert.match(httpMeasurementNote("shared-process"), /share one Node process/);
  assert.match(httpMeasurementNote(HTTP_PROTOCOL), /separate processes/);
  for (const data of [{ old: [1], isolated: fixture() }, { isolated: fixture(), old: [1] }])
    assert.throws(() => httpResults(data), /cannot mix/);
  assert.deepEqual(httpResults({}), { samples: {}, protocol: null });
});

test("failed or partial HTTP cells cannot become throughput bars", () => {
  const partial = fixture(); partial.rounds.pop();
  assert.throws(() => httpResults({ partial }), /exactly 2/);
  assert.throws(() => httpResults({ failed: { ...fixture(), error: "worker exited" } }), /records an error/);
  const failedRound = fixture(); Object.assign(failedRound.rounds[0], { error: "timeout" });
  assert.throws(() => httpResults({ failedRound }), /records an error/);
  for (const field of ["errors", "timeouts", "non2xx", "mismatches"] as const) {
    const cell = fixture(); cell.rounds[0].result[field] = 1;
    assert.throws(() => httpResults({ cell }), new RegExp(field));
  }
  const duplicate = fixture(); duplicate.rounds[1].block = 1;
  assert.throws(() => httpResults({ duplicate }), /round blocks/);
  const shared = fixture(); shared.rounds[0].loadPid = shared.rounds[0].serverPid;
  assert.throws(() => httpResults({ shared }), /separate server and load/);
});

test("HTTP protocol and required numeric fields reject missing or invalid values", () => {
  for (const value of [[], [NaN], [-1], null, { ...fixture(), protocol: "unknown" }])
    assert.throws(() => httpResults({ value }));
  for (const average of [NaN, Infinity, -1]) {
    const cell = fixture(); cell.rounds[0].result.requests.average = average;
    assert.throws(() => httpResults({ cell }), /finite request rate/);
  }
  const noCounter = fixture(); delete (noCounter.rounds[0].result as Partial<typeof noCounter.rounds[0]["result"]>).mismatches;
  assert.throws(() => httpResults({ noCounter }), /mismatches/);
  const noDuration = fixture(); noDuration.rounds[0].result.duration = 0;
  assert.throws(() => httpResults({ noDuration }), /positive duration/);
  const noHash = fixture(); noHash.moduleSha256 = "";
  assert.throws(() => httpResults({ noHash }), /module hash/);
});


test("isolated HTTP cells require the same load and sampling configuration", () => {
  for (const field of ["rounds", "durationSec", "connections", "warmupRounds", "seed"] as const) {
    const changed = fixture(); changed.config[field]++;
    assert.throws(() => httpResults({ first: fixture(), changed }), /same rounds, duration, connections, warmup and seed/);
  }
  assert.equal(Object.keys(httpResults({ first: fixture(), second: fixture() }).samples).length, 2);
});


test("server render errors cannot produce a throughput bar", () => {
  for (const renderErrors of [1, -1, NaN, null, "0"]) {
    const cell = fixture(); Object.assign(cell.rounds[0], { renderErrors });
    assert.throws(() => httpResults({ cell }), /renderErrors must be zero/);
  }
  const cell = fixture(); Object.assign(cell.rounds[0], { renderErrors: 0 });
  assert.deepEqual(httpResults({ cell }).samples.cell, [0, 10]);
});


test("report blocks unfinished checkpoints and mixed generations", () => {
  for (const status of ["preparing", "running", "failed"]) assert.throws(() => assertHttpCheckpointReady({ status }), /incomplete/);
  assertHttpCheckpointReady(undefined);
  assertHttpCheckpointReady({ status: "complete" });
  const changed = fixture(); changed.generationId = "different-run";
  assert.throws(() => httpResults({ first: fixture(), changed }), /same generation/);
  const noWorkload = fixture(); noWorkload.workload.n = 0;
  assert.throws(() => httpResults({ cell: noWorkload }), /workload/);
});


test("v2 report rejects missing or failed warmups", () => {
  const incomplete = fixture(); incomplete.rounds[0].warmupResults = [];
  assert.throws(() => httpResults({ cell: incomplete }), /warmup/);
  const failed = fixture(); failed.rounds[0].warmupResults[0].mismatches = 1;
  assert.throws(() => httpResults({ cell: failed }), /warmup mismatches/);
});
