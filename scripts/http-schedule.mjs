import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { runHttpRound } from "./http-benchmark.mjs";

const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(jobs, next) {
  const order = [...jobs];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function requireSuccess(result) {
  if (!result || !Number.isFinite(result.requests?.average) || result.requests.average < 0 ||
      !Number.isFinite(result.duration) || result.duration <= 0)
    throw new Error("HTTP round has no valid throughput result");
  for (const name of ["errors", "timeouts", "non2xx", "mismatches"]) {
    if (result[name] !== 0) throw new Error(`HTTP round reports ${name}: ${result[name]}`);
  }
}

function requireRoundSuccess(round, warmupRounds) {
  if (round.error) throw new Error(round.error);
  if (!Array.isArray(round.warmupResults) || round.warmupResults.length !== warmupRounds)
    throw new Error("HTTP round has incomplete warmup results");
  for (const warmup of round.warmupResults) requireSuccess(warmup);
  requireSuccess(round.result);
  if (round.renderErrors !== undefined && round.renderErrors !== 0)
    throw new Error(`HTTP server reports ${round.renderErrors} render errors`);
}

/** Each shuffled block measures every cell once, with a fresh server and load process. */
export async function runHttpSchedule(jobs, config, { existingCells = {}, onInitialize = () => {}, runRound = runHttpRound, onCell = () => {} } = {}) {
  const { rounds, durationSec, connections, warmupRounds = 1, seed } = config;
  if (!Number.isInteger(rounds) || rounds < 1 || !Number.isFinite(durationSec) || durationSec <= 0 ||
      !Number.isInteger(connections) || connections < 1 || !Number.isInteger(warmupRounds) || warmupRounds < 0 ||
      !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error("Invalid HTTP benchmark configuration");
  const settings = { rounds, durationSec, connections, warmupRounds, seed };
  const identities = jobs.map(job => {
    if (typeof job.key !== "string" || !job.key || typeof job.caseId !== "string" || !job.caseId ||
        !Number.isInteger(job.n) || job.n < 1) throw new Error("Invalid HTTP workload identity");
    return { key: job.key, caseId: job.caseId, n: job.n, moduleSha256: hash(job.modulePath) };
  });
  if (new Set(jobs.map(job => job.key)).size !== jobs.length) throw new Error("Duplicate HTTP cell");
  const scheduleSha256 = createHash("sha256").update(JSON.stringify({ settings, identities })).digest("hex");
  const next = random(seed);
  const orders = Array.from({ length: rounds }, () => shuffled(jobs, next));
  if (!existingCells || typeof existingCells !== "object" || Array.isArray(existingCells))
    throw new Error("Invalid HTTP resume data");
  let generationId;
  const cells = {};
  for (const [key, existing] of Object.entries(existingCells)) {
    const identity = identities.find(job => job.key === key);
    const mismatch = () => new Error(`Cannot resume HTTP cell ${key}: protocol, configuration, workload, bundle or generation differs`);
    if (!identity || !existing || existing.protocol !== "isolated-http-v2" ||
        existing.scope !== "rendered-html-fragment" || existing.moduleSha256 !== identity.moduleSha256 ||
        existing.workload?.caseId !== identity.caseId || existing.workload?.n !== identity.n ||
        existing.scheduleSha256 !== scheduleSha256 || typeof existing.generationId !== "string" || !existing.generationId ||
        Object.keys(settings).some(name => existing.config?.[name] !== settings[name]) ||
        !Array.isArray(existing.rounds) || !Array.isArray(existing.failureHistory)) throw mismatch();
    if (generationId && generationId !== existing.generationId) throw mismatch();
    generationId = existing.generationId;
    const blocks = new Set();
    for (const round of existing.rounds) {
      if (!Number.isInteger(round.block) || round.block < 1 || round.block > rounds || blocks.has(round.block) ||
          orders[round.block - 1][round.position]?.key !== key) throw mismatch();
      blocks.add(round.block);
      if (!round.error) {
        try { requireRoundSuccess(round, warmupRounds); } catch { throw mismatch(); }
      }
    }
    cells[key] = structuredClone(existing);
  }
  generationId ??= randomUUID();
  for (const identity of identities) {
    cells[identity.key] ??= {
      protocol: "isolated-http-v2", config: settings, moduleSha256: identity.moduleSha256,
      workload: { caseId: identity.caseId, n: identity.n }, scheduleSha256, generationId,
      scope: "rendered-html-fragment", rounds: [], failureHistory: [],
    };
  }
  await onInitialize(cells);
  const failures = [];
  const failedKeys = new Set();
  for (const [index, order] of orders.entries()) {
    const block = index + 1;
    for (const [position, job] of order.entries()) {
      const cell = cells[job.key];
      if (failedKeys.has(job.key)) continue;
      const previous = cell.rounds.find(round => round.block === block);
      if (previous && !previous.error) continue;
      if (previous) {
        cell.failureHistory.push(structuredClone(previous));
        cell.rounds = cell.rounds.filter(round => round.block !== block);
      }
      let round;
      try {
        if (job.preflightError) throw new Error(job.preflightError);
        if (hash(job.modulePath) !== cell.moduleSha256) throw new Error("SSR bundle changed during the HTTP run");
        round = { ...await runRound({ ...job, durationSec, connections, warmupRounds }), block, position };
        cell.rounds.push(round);
        requireRoundSuccess(round, warmupRounds);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (round) round.error = message;
        else cell.rounds.push({ block, position, error: message, childPids: error?.childPids ?? [],
          result: error?.result ?? null, warmupResults: error?.warmupResults ?? [] });
        failedKeys.add(job.key);
        failures.push(new Error(`HTTP benchmark failed for ${job.key}, block ${block}: ${message}`, { cause: error }));
      }
      cell.rounds.sort((a, b) => a.block - b.block);
      await onCell(job.key, cell);
    }
  }
  if (failures.length) {
    const error = new AggregateError(failures, failures.map(error => error.message).join("\n"));
    error.cells = cells;
    error.failedKeys = [...failedKeys];
    throw error;
  }
  return cells;
}
