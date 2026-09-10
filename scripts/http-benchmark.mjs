import { fork } from "node:child_process";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { StringDecoder } from "node:string_decoder";

const serverEntry = fileURLToPath(new URL("./http-server.mjs", import.meta.url));
const loadEntry = fileURLToPath(new URL("./http-load.mjs", import.meta.url));

/** Decode response chunks as one UTF-8 stream and finish only on message completion. */
export function installResponseDecoder(client) {
  const queue = client.pipelinedRequests;
  if (!queue || typeof queue.peek !== "function" || typeof queue.addBody !== "function" || typeof queue.terminateRequest !== "function") {
    throw new Error("Autocannon response queue does not support UTF-8 body validation");
  }
  const decoderKey = Symbol("responseDecoder");
  queue.addBody = (data) => {
    const response = queue.peek();
    if (!response) return;
    response[decoderKey] ??= new StringDecoder("utf8");
    response.body += response[decoderKey].write(data);
  };
  const terminate = queue.terminateRequest.bind(queue);
  queue.terminateRequest = () => {
    const response = terminate();
    if (response?.[decoderKey]) {
      response.body += response[decoderKey].end();
      delete response[decoderKey];
    }
    return response;
  };
}

/** One fresh HTTP server and separate load process; HTTP errors stay in the full result. */
export async function runHttpRound({ modulePath, caseId, n, durationSec, connections, warmupRounds = 1, timeoutMs }) {
  if (!isAbsolute(modulePath)) throw new Error("HTTP modulePath must be absolute");
  if (typeof caseId !== "string" || !caseId.length || !Number.isInteger(n) || n < 1 || !Number.isInteger(connections) || connections < 1 ||
      !Number.isFinite(durationSec) || durationSec <= 0 || !Number.isInteger(warmupRounds) || warmupRounds < 0) {
    throw new Error("Invalid HTTP round configuration");
  }
  const budget = timeoutMs ?? 15000 + (warmupRounds + 1) * (durationSec * 1000 + 5000);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("Invalid HTTP round timeout");
  const startedAt = new Date().toISOString();
  const children = [];
  const warmupResults = [];
  let stopping = false;
  let rejectFailure;
  const failure = new Promise((_resolve, reject) => { rejectFailure = reject; });
  const controller = new AbortController();
  const fail = (error) => { if (!stopping) rejectFailure(error); };
  const killNow = () => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  };
  const onInterrupt = () => { killNow(); process.exit(130); };
  const onTerminate = () => { killNow(); process.exit(143); };
  process.once("exit", killNow);
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  const timer = setTimeout(() => fail(new Error(`HTTP round timed out after ${budget}ms`)), budget);
  const spawn = (entry) => {
    const child = fork(entry, [], {
      execArgv: [], env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    children.push(child);
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    child.on("error", fail);
    child.on("exit", (code, signal) => {
      if (!stopping) fail(new Error(`HTTP child ${child.pid} exited (${signal ?? code})${stderr ? `: ${stderr}` : ""}`));
    });
    child.on("message", (message) => {
      if (message.type === "failure") {
        const error = new Error(message.error);
        if (message.result) error.result = message.result;
        fail(error);
      }
    });
    return child;
  };
  const expect = (child, type) => new Promise((resolve) => {
    const listener = (message) => {
      if (message.type === type) {
        child.off("message", listener);
        resolve(message);
      }
    };
    child.on("message", listener);
  });
  const request = (child, message, reply) => {
    const response = expect(child, reply);
    child.send(message, (error) => { if (error) fail(error); });
    return response;
  };
  try {
    const server = spawn(serverEntry);
    const load = spawn(loadEntry);
    const work = async () => {
      const [ready] = await Promise.all([
        request(server, { type: "init", modulePath, caseId, n, loadPid: load.pid }, "ready"),
        request(load, { type: "init", serverPid: server.pid }, "ready"),
      ]);
      const url = `http://127.0.0.1:${ready.port}`;
      const response = await fetch(url, { signal: controller.signal });
      const expectedBody = await response.text();
      if (response.status !== 200 || !/^text\/html(?:;|$)/i.test(response.headers.get("content-type") ?? "") || !expectedBody.length) {
        const metrics = await request(server, { type: "metrics-end" }, "metrics");
        throw new Error(`HTTP response check failed: status ${response.status}, content-type ${response.headers.get("content-type")}, body length ${expectedBody.length}${metrics.firstRenderError ? `; ${metrics.firstRenderError}` : ""}`);
      }
      const sample = () => request(load, { type: "run", url, durationSec, connections, expectedBody }, "result");
      for (let round = 0; round < warmupRounds; round++) warmupResults.push((await sample()).result);
      await request(server, { type: "metrics-start" }, "metrics-started");
      const measured = await sample();
      const metrics = await request(server, { type: "metrics-end" }, "metrics");
      const { type: _type, ...serverMetrics } = metrics;
      const { type: _loadType, ...loadMetrics } = measured;
      return { serverPid: server.pid, loadPid: load.pid, startedAt, finishedAt: new Date().toISOString(), ...serverMetrics, ...loadMetrics, warmupResults };
    };
    return await Promise.race([work(), failure]);
  } catch (error) {
    error.childPids = children.map((child) => child.pid);
    error.warmupResults = warmupResults;
    throw error;
  } finally {
    stopping = true;
    clearTimeout(timer);
    controller.abort();
    await Promise.all(children.map((child) => new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      const force = setTimeout(() => child.kill("SIGKILL"), 500);
      child.once("exit", () => { clearTimeout(force); resolve(); });
      child.kill("SIGTERM");
    })));
    process.off("exit", killNow);
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
  }
}
