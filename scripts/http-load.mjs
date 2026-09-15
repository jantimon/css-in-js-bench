import autocannon from "autocannon";
import { createRequire } from "node:module";
import { installResponseDecoder } from "./http-benchmark.mjs";

const autocannonVersion = createRequire(import.meta.url)("autocannon/package.json").version;

let peerPid;
let running;
const send = (message) => process.connected && process.send(message);
const shutdown = () => {
  running?.stop();
  process.exit(0);
};
process.on("disconnect", () => {
  if (peerPid) try { process.kill(peerPid, "SIGKILL"); } catch {}
  shutdown();
});
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("message", (message) => {
  if (message.type === "init") {
    peerPid = message.serverPid;
    send({ type: "ready" });
  } else if (message.type === "run") {
    try {
      const cpuStart = process.cpuUsage();
      running = autocannon({
        url: message.url,
        duration: message.durationSec,
        connections: message.connections,
        expectBody: message.expectedBody,
        setupClient: installResponseDecoder,
      }, (error, result) => {
        running = null;
        if (error) send({ type: "failure", error: String(error.stack ?? error), result });
        else send({ type: "result", result, loadCpuUsage: process.cpuUsage(cpuStart), loadMemory: process.memoryUsage(), nodeVersion: process.version, autocannonVersion });
      });
    } catch (error) {
      send({ type: "failure", error: String(error.stack ?? error) });
    }
  } else if (message.type === "shutdown") shutdown();
});
