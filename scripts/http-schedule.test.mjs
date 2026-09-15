import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHttpSchedule } from "./http-schedule.mjs";

const config = { rounds: 3, durationSec: 1, connections: 2, warmupRounds: 1, seed: 20260907 };
const result = () => ({ duration: 1, requests: { average: 12 }, errors: 0, timeouts: 0, non2xx: 0, mismatches: 0, latency: { p50: 1, p99: 4 } });
function jobs() {
  const directory = mkdtempSync(join(tmpdir(), "http-schedule-"));
  return ["react", "solid", "styled"].map((lane) => {
    const modulePath = join(directory, `${lane}.mjs`);
    writeFileSync(modulePath, "export function renderHtml() { return '<button>ok</button>'; }\n");
    return { key: `case/${lane}`, caseId: "case", n: 10, modulePath };
  });
}

test("HTTP blocks cover every cell sequentially with reproducible shuffled order", async () => {
  const input = jobs();
  async function run() {
    const order = [], persisted = [];
    let active = 0;
    const data = await runHttpSchedule(input, config, {
      runRound: async (options) => {
        assert.equal(++active, 1);
        order.push(options.key);
        assert.equal(options.warmupRounds, 1);
        await new Promise((resolve) => setImmediate(resolve));
        active--;
        return { serverPid: 1, loadPid: 2, result: result(), warmupResults: [result()] };
      },
      onCell: (key, cell) => persisted.push({ key, cell: structuredClone(cell) }),
    });
    assert.equal(persisted.length, 9);
    for (let block = 0; block < 3; block++) assert.deepEqual([...order.slice(block * 3, block * 3 + 3)].sort(), input.map(j => j.key).sort());
    for (const cell of Object.values(data)) {
      assert.deepEqual(cell.rounds.map(r => r.block), [1, 2, 3]);
      assert.equal(cell.protocol, "isolated-http-v2");
      assert.match(cell.moduleSha256, /^[a-f0-9]{64}$/);
      assert.deepEqual(cell.rounds[0].result.latency, { p50: 1, p99: 4 });
    }
    return order;
  }
  assert.deepEqual(await run(), await run());
});

test("HTTP failures persist full results while other cells run", async () => {
  let calls = 0, saved;
  await assert.rejects(runHttpSchedule(jobs(), config, {
    runRound: async () => { calls++; return { result: { ...result(), non2xx: 3 }, warmupResults: [result()] }; },
    onCell: (key, cell) => { saved = structuredClone(cell); },
  }), /non2xx: 3/);
  assert.equal(calls, 3);
  assert.equal(saved.rounds[0].result.non2xx, 3);
  assert.match(saved.rounds[0].error, /non2xx/);
});

test("warmup failures cannot produce a clean measured result", async () => {
  await assert.rejects(runHttpSchedule(jobs(), config, {
    runRound: async () => ({ result: result(), warmupResults: [{ ...result(), errors: 1 }] }),
  }), /errors: 1/);
});

test("a bundle change between blocks fails before measuring the changed module", async () => {
  const input = jobs().slice(0, 1);
  let calls = 0;
  await assert.rejects(runHttpSchedule(input, config, {
    runRound: async () => { calls++; return { result: result(), warmupResults: [result()] }; },
    onCell: () => writeFileSync(input[0].modulePath, "export function renderHtml(){ return 'different'; }\n"),
  }), /bundle changed/);
  assert.equal(calls, 1);
});

test("worker exceptions retain available load and warmup diagnostics", async () => {
  let saved;
  const failure = Object.assign(new Error("worker stopped"), {
    result: { ...result(), errors: 2 }, warmupResults: [result()], childPids: [12, 13],
  });
  await assert.rejects(runHttpSchedule(jobs(), config, {
    runRound: async () => { throw failure; },
    onCell: (_key, cell) => { saved = structuredClone(cell.rounds[0]); },
  }), /worker stopped/);
  assert.equal(saved.result.errors, 2);
  assert.equal(saved.warmupResults.length, 1);
  assert.deepEqual(saved.childPids, [12, 13]);
});

const successfulRound = () => ({ result: result(), warmupResults: [result()] });

test("one failed cell does not stop healthy cells and resume retries only missing or failed blocks", async () => {
  const input = jobs();
  let saved, calls = [];
  await assert.rejects(runHttpSchedule(input, config, {
    onInitialize: cells => { saved = cells; },
    runRound: async job => {
      calls.push(job.key);
      if (job.key === input[0].key) throw new Error("unavailable");
      return successfulRound();
    },
  }), error => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.failedKeys, [input[0].key]);
    assert.equal(error.cells, saved);
    return true;
  });
  assert.equal(calls.filter(key => key === input[0].key).length, 1);
  assert.equal(calls.length, 7);
  const retained = structuredClone(saved);
  calls = [];
  const resumed = await runHttpSchedule(input, config, {
    existingCells: saved,
    runRound: async job => { calls.push(job.key); return successfulRound(); },
  });
  assert.deepEqual(calls, Array(3).fill(input[0].key));
  assert.deepEqual(saved, retained, "resume does not mutate its input");
  assert.equal(resumed[input[0].key].failureHistory.length, 1);
  assert.equal(resumed[input[0].key].failureHistory[0].error, "unavailable");
  for (const cell of Object.values(resumed)) assert.deepEqual(cell.rounds.map(r => r.block), [1, 2, 3]);
  await runHttpSchedule(input, config, { existingCells: resumed, runRound: () => assert.fail("complete rounds must be skipped") });
});

test("resume rejects mismatched provenance before starting any worker", async () => {
  const input = jobs();
  const data = await runHttpSchedule(input, config, { runRound: async () => successfulRound() });
  const key = input[0].key;
  const mutations = [
    cell => { cell.protocol = "isolated-http-v1"; },
    cell => { cell.workload.n++; },
    cell => { cell.workload.caseId = "another"; },
    cell => { cell.config.connections++; },
    cell => { cell.moduleSha256 = "f".repeat(64); },
    cell => { cell.scheduleSha256 = "f".repeat(64); },
    cell => { cell.generationId = "another"; },
    cell => { delete cell.generationId; },
    cell => { cell.rounds[0].result.errors = 1; },
    cell => { cell.rounds.push(cell.rounds[0]); },
  ];
  for (const mutate of mutations) {
    const existingCells = structuredClone(data);
    mutate(existingCells[key]);
    await assert.rejects(runHttpSchedule(input, config, { existingCells, runRound: () => assert.fail("must fail before worker") }), /Cannot resume/);
  }
  await assert.rejects(runHttpSchedule([...input].reverse(), config, { existingCells: data }), /Cannot resume/);
  await assert.rejects(runHttpSchedule(input.slice(1), config, { existingCells: data }), /Cannot resume/);
  writeFileSync(input[0].modulePath, "changed");
  await assert.rejects(runHttpSchedule(input, config, { existingCells: data }), /Cannot resume/);
});

test("resume fills missing cells and preserves each block's original position", async () => {
  const input = jobs();
  const complete = await runHttpSchedule(input, config, { runRound: async () => successfulRound() });
  const partial = structuredClone(complete);
  delete partial[input[0].key];
  partial[input[1].key].rounds = partial[input[1].key].rounds.slice(0, 1);
  let calls = 0;
  const resumed = await runHttpSchedule(input, config, { existingCells: partial, runRound: async () => { calls++; return successfulRound(); } });
  assert.equal(calls, 5);
  assert.deepEqual(resumed, complete);
});

test("persistence errors stop the run instead of continuing without durable results", async () => {
  let calls = 0;
  await assert.rejects(runHttpSchedule(jobs(), config, {
    runRound: async () => { calls++; return successfulRound(); },
    onCell: () => { throw new Error("disk full"); },
  }), /disk full/);
  assert.equal(calls, 1);
});

test("repeated failed retries keep each prior failure and keep healthy cells complete", async () => {
  const input = jobs();
  let saved;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let calls = 0;
    await assert.rejects(runHttpSchedule(input, config, {
      existingCells: saved,
      onInitialize: cells => { saved = cells; },
      runRound: async job => {
        calls++;
        if (job.key === input[0].key) throw new Error(`failure ${attempt}`);
        return successfulRound();
      },
    }), new RegExp(`failure ${attempt}`));
    assert.equal(calls, attempt === 1 ? 7 : 1);
    const cell = saved[input[0].key];
    assert.equal(cell.rounds.length, 1);
    assert.equal(cell.rounds[0].error, `failure ${attempt}`);
    assert.deepEqual(cell.failureHistory.map(round => round.error), Array.from({ length: attempt - 1 }, (_, i) => `failure ${i + 1}`));
  }
});

test("preflight failures do not start a worker and allow healthy cells to finish", async () => {
  const input = jobs();
  input[0].preflightError = "snapshot render failed";
  const calls = [];
  let saved;
  await assert.rejects(runHttpSchedule(input, config, {
    onInitialize: cells => { saved = cells; },
    runRound: async job => { calls.push(job.key); return successfulRound(); },
  }), /snapshot render failed/);
  assert.equal(calls.length, 6);
  assert.ok(calls.every(key => key !== input[0].key));
  assert.equal(saved[input[0].key].rounds.length, 1);
  assert.equal(saved[input[0].key].rounds[0].error, "snapshot render failed");
  delete input[0].preflightError;
  calls.length = 0;
  const resumed = await runHttpSchedule(input, config, {
    existingCells: saved,
    runRound: async job => { calls.push(job.key); return successfulRound(); },
  });
  assert.deepEqual(calls, Array(3).fill(input[0].key));
  assert.equal(resumed[input[0].key].failureHistory[0].error, "snapshot render failed");
});
