import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runHttpPass, HTTP_CHECKPOINT } from "./http-pass.mjs";
import { runHttpSchedule } from "./http-schedule.mjs";

const config = { rounds: 2, durationSec: 8, connections: 10, warmupRounds: 1, seed: 20260907 };
const jobs = [{ key: "case/react" }, { key: "case/solid" }];
const cell = (count = 2) => ({
  protocol: "isolated-http-v2", config, moduleSha256: "a".repeat(64), scope: "rendered-html-fragment",
  workload: { caseId: "case", n: 10 }, generationId: "test-generation", scheduleSha256: "b".repeat(64), failureHistory: [],
  rounds: Array.from({ length: count }, (_, index) => ({
    block: index + 1, serverPid: 10 + index, loadPid: 20 + index,
    startedAt: "2026-09-08T00:00:00Z", finishedAt: "2026-09-08T00:00:08Z",
    warmupResults: [{ requests: { average: 25 }, duration: 8, errors: 0, timeouts: 0, non2xx: 0, mismatches: 0 }],
    result: { requests: { average: 25 }, duration: 8, errors: 0, timeouts: 0, non2xx: 0, mismatches: 0 },
  })),
});
function fixture() {
  const resultDir = mkdtempSync(join(tmpdir(), "http-pass-"));
  const published = join(resultDir, "measurement-autocannon.json");
  const original = '{"case/react":[1,2],"case/solid":[3,4]}\n';
  writeFileSync(published, original);
  const snapshot = '{"saved":"snapshot"}\n';
  writeFileSync(join(resultDir, "snapshot.json"), snapshot);
  return { resultDir, published, original, checkpoint: join(resultDir, HTTP_CHECKPOINT), snapshot };
}
const read = (file) => JSON.parse(readFileSync(file, "utf8"));

test("HTTP pass checkpoints progress and publishes only after all cells complete", async () => {
  const f = fixture();
  const complete = Object.fromEntries(jobs.map(({ key }) => [key, cell()]));
  const output = await runHttpPass(jobs, config, { resultDir: f.resultDir, runSchedule: async (_jobs, _config, callbacks) => {
    assert.equal(callbacks.existingCells, undefined);
    const progress = Object.fromEntries(jobs.map(({ key }) => [key, cell(0)]));
    await callbacks.onInitialize(progress);
    for (const { key } of jobs) {
      await callbacks.onCell(key, complete[key]);
      assert.equal(read(f.checkpoint).status, "running");
      assert.equal(readFileSync(f.published, "utf8"), f.original);
    }
    return complete;
  } });
  assert.deepEqual(output, complete);
  assert.deepEqual(read(f.published), complete);
  assert.deepEqual(read(f.checkpoint), { status: "complete", cells: complete });
  assert.equal(readFileSync(join(f.resultDir, "snapshot.json"), "utf8"), f.snapshot);
});

test("failed HTTP pass keeps published data and its round diagnostics", async () => {
  const f = fixture();
  await assert.rejects(runHttpPass(jobs, config, { resultDir: f.resultDir, runSchedule: async (_jobs, _config, callbacks) => {
    const progress = { "case/react": cell(1), "case/solid": cell(0) };
    await callbacks.onInitialize(progress);
    progress["case/solid"].rounds.push({ block: 1, error: "worker failed", result: { mismatches: 4 } });
    await callbacks.onCell("case/solid", progress["case/solid"]);
    throw new Error("worker failed");
  } }), /worker failed/);
  assert.equal(readFileSync(f.published, "utf8"), f.original);
  const checkpoint = read(f.checkpoint);
  assert.equal(checkpoint.status, "failed");
  assert.equal(checkpoint.error, "worker failed");
  assert.equal(checkpoint.cells["case/react"].rounds.length, 1);
  assert.equal(checkpoint.cells["case/solid"].rounds[0].result.mismatches, 4);
});

test("resume requires an explicit readable checkpoint and passes saved cells to scheduler", async () => {
  const f = fixture();
  await assert.rejects(runHttpPass(jobs, config, { resultDir: f.resultDir, resume: true }), /checkpoint is missing/);
  assert.equal(existsSync(f.checkpoint), false);
  const saved = { "case/react": cell(1), "case/solid": cell(0) };
  writeFileSync(f.checkpoint, JSON.stringify({ status: "failed", cells: saved, error: "interrupted" }));
  const complete = Object.fromEntries(jobs.map(({ key }) => [key, cell()]));
  await runHttpPass(jobs, config, { resultDir: f.resultDir, resume: true, runSchedule: async (_jobs, _config, callbacks) => {
    assert.deepEqual(callbacks.existingCells, saved);
    await callbacks.onInitialize(complete);
    return complete;
  } });
  assert.equal(read(f.checkpoint).status, "complete");
  assert.deepEqual(read(f.published), complete);
});

test("fresh pass does not reuse a saved checkpoint and incomplete results cannot publish", async () => {
  const f = fixture();
  writeFileSync(f.checkpoint, JSON.stringify({ status: "failed", cells: { obsolete: cell() } }));
  await assert.rejects(runHttpPass(jobs, config, { resultDir: f.resultDir, runSchedule: async (_jobs, _config, callbacks) => {
    assert.equal(callbacks.existingCells, undefined);
    return { "case/react": cell(), "case/solid": cell(1) };
  } }), /exactly 2 completed rounds/);
  assert.equal(readFileSync(f.published, "utf8"), f.original);
  assert.equal(read(f.checkpoint).status, "failed");
  assert.equal("obsolete" in read(f.checkpoint).cells, false);
  await assert.rejects(runHttpPass(jobs, config, { resultDir: f.resultDir, runSchedule: async () => ({ "case/react": cell() }) }), /cells differ/);
  assert.equal(readFileSync(f.published, "utf8"), f.original);
});


test("preparation without validated bundles requires a fresh HTTP pass", async () => {
  const f = fixture();
  writeFileSync(f.checkpoint, JSON.stringify({ status: "preparing", cells: {} }));
  await assert.rejects(runHttpPass(jobs, config, { resultDir: f.resultDir, resume: true }), /preparation.*fresh --measure=autocannon/);
  assert.equal(read(f.checkpoint).status, "preparing");
  assert.equal(readFileSync(f.published, "utf8"), f.original);
});

test("real scheduler and staging retain good rounds and resume failed work before publication", async () => {
  const f = fixture();
  const modulePath = join(f.resultDir, "fixture.mjs");
  writeFileSync(modulePath, 'export const renderHtml = () => "<p>ready</p>";\n');
  const input = jobs.map(job => ({ ...job, modulePath, caseId: "case", n: 10 }));
  let rejectReact = true;
  const calls = [];
  const schedule = (selected, settings, callbacks) => runHttpSchedule(selected, settings, {
    ...callbacks,
    runRound: async (job) => {
      calls.push(job.key);
      if (rejectReact && job.key === "case/react") throw new Error("worker interrupted");
      const { block: _block, ...round } = cell().rounds[0];
      return { ...round, renderErrors: 0, warmupResults: [structuredClone(round.result)] };
    },
  });
  await assert.rejects(runHttpPass(input, config, { resultDir: f.resultDir, runSchedule: schedule }), /worker interrupted|failed/i);
  const checkpoint = read(f.checkpoint);
  assert.equal(checkpoint.status, "failed");
  assert.equal(checkpoint.cells["case/solid"].rounds.length, 2);
  assert.equal(readFileSync(f.published, "utf8"), f.original);
  calls.length = 0;
  rejectReact = false;
  const output = await runHttpPass(input, config, { resultDir: f.resultDir, resume: true, runSchedule: schedule });
  assert.deepEqual(calls, ["case/react", "case/react"]);
  assert.deepEqual(output["case/solid"].rounds, checkpoint.cells["case/solid"].rounds);
  assert.equal(output["case/react"].failureHistory.length, 1);
  assert.equal(read(f.checkpoint).status, "complete");
  assert.deepEqual(read(f.published), output);
});
