import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import autocannon from "autocannon";
import { runHttpRound, installResponseDecoder } from "./http-benchmark.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "css-http-test-"));
function fixture(name, source) {
  const file = path.join(dir, `${name}.mjs`);
  writeFileSync(file, source);
  return file;
}
const options = (modulePath, extra = {}) => ({
  modulePath, caseId: "case", n: 3, durationSec: 0.2, connections: 2, warmupRounds: 0, timeoutMs: 10000, ...extra,
});
const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const assertStopped = (pids) => {
  assert.equal(pids.length, 2);
  for (const pid of pids) assert.equal(isAlive(pid), false, `child ${pid} must exit`);
};

test("HTTP round separates supervisor, server and load processes and retains results", async () => {
  const file = fixture("valid", `export function renderHtml(caseId, n) {
    if (process.env.NODE_ENV !== "production") throw new Error("production required");
    if (caseId !== "case" || n !== 3) throw new Error("wrong workload");
    return "<p>rendered</p>";
  }`);
  const round = await runHttpRound(options(file, { warmupRounds: 1 }));
  assert.equal(new Set([process.pid, round.serverPid, round.loadPid]).size, 3);
  assert.ok(round.result.requests.total > 0);
  assert.ok(round.result.requests.average > 0);
  assert.equal(typeof round.result.latency.p99, "number");
  assert.equal(typeof round.result.throughput.average, "number");
  assert.equal(round.result.errors, 0);
  assert.equal(round.result.timeouts, 0);
  assert.equal(round.result.mismatches, 0);
  assert.equal(round.result.non2xx, 0);
  assert.equal(round.warmupResults.length, 1);
  assert.ok(round.warmupResults[0].requests.total > 0);
  assert.ok(round.serverCpuUsage.user >= 0);
  assert.ok(round.serverMemory.rss > 0);
  assert.ok(round.loadCpuUsage.user >= 0);
  assert.ok(round.loadMemory.rss > 0);
  assert.equal(round.nodeVersion, process.version);
  assert.match(round.autocannonVersion, /^\d+\.\d+\.\d+/);
  assert.ok(Date.parse(round.finishedAt) >= Date.parse(round.startedAt));
  assertStopped([round.serverPid, round.loadPid]);
});

test("HTTP server supports the renderCase html fallback", async () => {
  const file = fixture("fallback", 'export const renderCase = () => ({html:"<p>fallback</p>",css:"p{}"});');
  const round = await runHttpRound(options(file));
  assert.ok(round.result.requests.total > 0);
  assert.equal(round.result.mismatches, 0);
  assertStopped([round.serverPid, round.loadPid]);
});

test("module and initial render failures propagate and clean up both children", async () => {
  for (const [name, source, pattern] of [
    ["bad-module", 'throw new Error("module import failed");', /module import failed/],
    ["missing-export", 'export const value=1;', /export renderHtml or renderCase/],
    ["bad-render", 'export const renderHtml=()=>{throw new Error("render failed deliberately")};', /render failed deliberately/],
  ]) {
    await assert.rejects(runHttpRound(options(fixture(name, source))), (error) => {
      assert.match(error.message, pattern);
      assertStopped(error.childPids);
      return true;
    });
  }
});

test("render failures during load retain HTTP status and mismatch counters", async () => {
  const file = fixture("load-error", 'let calls=0; export function renderHtml(){if(++calls>1)throw new Error("load render failed");return "<p>ready</p>";}');
  const round = await runHttpRound(options(file));
  assert.ok(round.result.non2xx > 0);
  assert.ok(round.result.statusCodeStats["500"].count > 0);
  assert.ok(round.result.mismatches > 0);
  assert.match(round.firstRenderError, /load render failed/);
  assert.ok(round.renderErrors > 0);
  assertStopped([round.serverPid, round.loadPid]);
});

test("changed response bodies remain visible as mismatches", async () => {
  const file = fixture("mismatch", 'let calls=0;export const renderHtml=()=>`<p>${calls++}</p>`;');
  const round = await runHttpRound(options(file));
  assert.ok(round.result.mismatches > 0);
  assert.equal(round.result.non2xx, 0);
  assertStopped([round.serverPid, round.loadPid]);
});

test("completed Unicode responses stay valid across HTTP body chunk boundaries", async () => {
  const expectedBody = `<p>${"αβ🙂€".repeat(10000)}</p>`;
  const body = Buffer.from(expectedBody);
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    // Byte 4 splits the first two-byte alpha across HTTP chunks.
    response.write(body.subarray(0, 4));
    setTimeout(() => response.end(body.subarray(4)), 5);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    let decodedWithReplacement = false;
    const uncorrected = await autocannon({ url, duration: 0.1, connections: 1,
      verifyBody: (body) => {
        if (body !== expectedBody && body.includes("\uFFFD")) decodedWithReplacement = true;
        return body === expectedBody;
      },
    });
    assert.ok(uncorrected.mismatches > 0);
    assert.ok(decodedWithReplacement, "chunk decoding changes valid UTF-8 into replacement characters");
    const corrected = await autocannon({ url, duration: 0.1, connections: 1, expectBody: expectedBody, setupClient: installResponseDecoder });
    assert.ok(corrected.requests.total > 0);
    assert.equal(corrected.mismatches, 0);
    assert.equal(corrected.errors, 0);
    assert.equal(corrected.non2xx, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("large slow Unicode HTML passes full response validation in the load child", async () => {
  const file = fixture("large-unicode", `const html="<p>"+"αβ🙂€".repeat(30000)+"</p>";
    export function renderHtml(){const until=performance.now()+5;while(performance.now()<until){}return html;}`);
  const round = await runHttpRound(options(file, { connections: 3 }));
  assert.ok(round.result.requests.total > 0);
  assert.equal(round.result.mismatches, 0);
  assert.equal(round.result.errors, 0);
  assert.equal(round.result.non2xx, 0);
  assertStopped([round.serverPid, round.loadPid]);
});

test("a blocked render meets the deadline and kills both children", async () => {
  const file = fixture("blocked", 'export function renderHtml(){while(true){}}');
  const start = Date.now();
  await assert.rejects(runHttpRound(options(file, { timeoutMs: 500 })), (error) => {
    assert.match(error.message, /timed out/);
    assertStopped(error.childPids);
    return true;
  });
  assert.ok(Date.now() - start < 5000);
});

test("startup and during-load process failures clean up both children", async () => {
  const blocked = fixture("blocked-startup", 'await new Promise(()=>{}); export const renderHtml=()=>"<p>ready</p>";');
  await assert.rejects(runHttpRound(options(blocked, { timeoutMs: 500 })), (error) => {
    assert.match(error.message, /timed out/);
    assertStopped(error.childPids);
    return true;
  });
  const crashed = fixture("crashed-server", 'let calls=0;export function renderHtml(){if(++calls>1)process.exit(17);return "<p>ready</p>";}');
  await assert.rejects(runHttpRound(options(crashed)), (error) => {
    assert.match(error.message, /exited \(17\)/);
    assertStopped(error.childPids);
    return true;
  });
});

for (const signal of ["SIGINT", "SIGKILL"]) test(`parent ${signal} stops a blocked server`, async () => {
  const pidFile = path.join(dir, `parent-${signal}-pid.json`);
  const file = fixture(`parent-blocked-${signal}`, `import {writeFileSync} from "node:fs";
    export function renderHtml(){writeFileSync(${JSON.stringify(pidFile)},JSON.stringify({serverPid:process.pid}));while(true){}}`);
  const harnessUrl = pathToFileURL(path.resolve("scripts/http-benchmark.mjs")).href;
  const parentEntry = fixture(`parent-${signal}`, `import {runHttpRound} from ${JSON.stringify(harnessUrl)};
    await runHttpRound(${JSON.stringify(options(file, { timeoutMs: 15000 }))});`);
  const parent = spawn(process.execPath, [parentEntry], { stdio: "ignore" });
  try {
    const deadline = Date.now() + 5000;
    while (!existsSync(pidFile) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(existsSync(pidFile), "server receives initial HTTP request");
    const { serverPid } = JSON.parse(readFileSync(pidFile));
    const exited = new Promise((resolve) => parent.once("exit", resolve));
    parent.kill(signal);
    await exited;
    const stopBy = Date.now() + 3000;
    while (isAlive(serverPid) && Date.now() < stopBy) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(isAlive(serverPid), false, "supervisor or disconnect guard kills blocked server");
  } finally {
    if (parent.exitCode === null && parent.signalCode === null) parent.kill("SIGKILL");
  }
});
