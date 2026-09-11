export const HTTP_PROTOCOL = "isolated-http-v2";
export type HttpProtocol = typeof HTTP_PROTOCOL | "isolated-http-v1" | "shared-process";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const positiveInteger = (value: unknown): value is number =>
  nonnegative(value) && Number.isInteger(value) && value > 0;

/** Read round request rates without pooling latency percentiles or mixing process setups. */
export function httpResults(data: Record<string, unknown>): {
  samples: Record<string, number[]>;
  protocol: HttpProtocol | null;
} {
  const samples: Record<string, number[]> = {};
  let protocol: HttpProtocol | null = null;
  let configuration: string | null = null;
  let generation: string | null = null;
  for (const [key, value] of Object.entries(data)) {
    const fail = (reason: string): never => { throw new Error(`HTTP results ${key}: ${reason}`); };
    let cellProtocol: HttpProtocol;
    let rates: number[];
    if (Array.isArray(value)) {
      if (!value.length || !value.every(nonnegative)) fail("shared-process samples must be nonempty finite request rates");
      cellProtocol = "shared-process";
      rates = value;
    } else {
      if (!record(value) || ![HTTP_PROTOCOL, "isolated-http-v1"].includes(value.protocol as string)) fail("unsupported or missing protocol");
      const cell = value as Record<string, unknown>;
      if ("error" in cell) fail("cell records an error");
      if (cell.scope !== "rendered-html-fragment" || typeof cell.moduleSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(cell.moduleSha256))
        fail("missing rendered-fragment scope or module hash");
      if (cell.protocol === HTTP_PROTOCOL) {
        if (!record(cell.workload) || typeof cell.workload.caseId !== "string" || !cell.workload.caseId || !positiveInteger(cell.workload.n))
          fail("missing workload identity");
        if (typeof cell.generationId !== "string" || !cell.generationId || typeof cell.scheduleSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(cell.scheduleSha256))
          fail("missing generation or schedule identity");
        const identity = JSON.stringify([cell.generationId, cell.scheduleSha256]);
        if (generation !== null && generation !== identity) fail("HTTP cells must belong to the same generation and schedule");
        generation = identity;
      }
      const config = cell.config;
      if (!record(config) || !positiveInteger(config.rounds) || !nonnegative(config.durationSec) || config.durationSec === 0 ||
          !positiveInteger(config.connections) || !nonnegative(config.warmupRounds) || !Number.isInteger(config.warmupRounds) ||
          !nonnegative(config.seed) || !Number.isInteger(config.seed) || config.seed > 0xffffffff)
        fail("invalid round configuration");
      const settings = config as Record<string, number>;
      const signature = JSON.stringify([settings.rounds, settings.durationSec, settings.connections, settings.warmupRounds, settings.seed]);
      if (configuration !== null && configuration !== signature) fail("isolated measurements require the same rounds, duration, connections, warmup and seed across cells");
      configuration = signature;
      if (!Array.isArray(cell.rounds) || cell.rounds.length !== settings.rounds) fail(`requires exactly ${settings.rounds} completed rounds`);
      const blocks = new Set<number>();
      rates = (cell.rounds as unknown[]).map((entry) => {
        if (!record(entry) || "error" in entry) fail("round is missing or records an error");
        const round = entry as Record<string, unknown>;
        if (!positiveInteger(round.block) || round.block > settings.rounds || blocks.has(round.block)) fail("round blocks must cover 1 through the configured round count");
        blocks.add(round.block as number);
        if (!positiveInteger(round.serverPid) || !positiveInteger(round.loadPid) || round.serverPid === round.loadPid)
          fail("round requires separate server and load processes");
        const start = typeof round.startedAt === "string" ? Date.parse(round.startedAt) : NaN;
        const finish = typeof round.finishedAt === "string" ? Date.parse(round.finishedAt) : NaN;
        if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) fail("invalid round timestamps");
        if ("renderErrors" in round && (!nonnegative(round.renderErrors) || round.renderErrors !== 0)) fail("round renderErrors must be zero");
        if (cell.protocol === HTTP_PROTOCOL) {
          if (!Array.isArray(round.warmupResults) || round.warmupResults.length !== settings.warmupRounds)
            fail("round requires all warmup results");
          for (const warmup of round.warmupResults as unknown[]) {
            if (!record(warmup) || "error" in warmup || !record(warmup.requests) || !nonnegative(warmup.requests.average) || !nonnegative(warmup.duration) || warmup.duration === 0)
              fail("round has invalid warmup results");
            for (const name of ["errors", "timeouts", "non2xx", "mismatches"])
              if ((warmup as Record<string, unknown>)[name] !== 0) fail(`warmup ${name} must be zero`);
          }
        }
        const result = round.result;
        if (!record(result) || "error" in result) fail("round has no successful result");
        const measured = result as Record<string, unknown>;
        if (!record(measured.requests) || !nonnegative(measured.requests.average) || !nonnegative(measured.duration) || measured.duration === 0)
          fail("round requires a finite request rate and positive duration");
        for (const name of ["errors", "timeouts", "non2xx", "mismatches"]) {
          if (!nonnegative(measured[name]) || measured[name] !== 0) fail(`round ${name} must be zero`);
        }
        return (measured.requests as { average: number }).average;
      });
      cellProtocol = cell.protocol as HttpProtocol;
    }
    if (protocol !== null && protocol !== cellProtocol) throw new Error("HTTP results cannot mix shared-process and isolated HTTP protocols; regenerate the HTTP pass for all lanes");
    protocol = cellProtocol;
    samples[key] = rates;
  }
  return { samples, protocol };
}

export function httpMeasurementNote(protocol: HttpProtocol | null): string {
  if (protocol === HTTP_PROTOCOL || protocol === "isolated-http-v1")
    return "Server and load generator run in separate processes on this host. Bars show the median of round request rates. Responses contain rendered HTML fragments. Raw results retain each round's latency and error data; latency percentiles are not pooled across rounds.";
  if (protocol === "shared-process")
    return "Shared-process measurement: server and load generator share one Node process. Bars show the median of round request rates. Responses contain rendered HTML fragments.";
  return "No HTTP throughput measurements are available.";
}

/** A pending pass must not expose the previous published HTTP results as the current run. */
export function assertHttpCheckpointReady(checkpoint: unknown): void {
  if (checkpoint !== undefined && (!record(checkpoint) || checkpoint.status !== "complete"))
    throw new Error("HTTP pass is incomplete; finish or resume --measure=autocannon --resume-http before generating the report");
}
