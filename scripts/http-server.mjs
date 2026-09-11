import { createServer } from "node:http";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

let server;
let peerPid;
let cpuStart;
let renderErrors = 0;
let firstRenderError;
const send = (message) => process.connected && process.send(message);
const shutdown = () => {
  server?.closeAllConnections();
  server?.close();
  process.exit(0);
};
process.on("disconnect", () => {
  if (peerPid) try { process.kill(peerPid, "SIGKILL"); } catch {}
  shutdown();
});
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("message", async (message) => {
  try {
    if (message.type === "init") {
      peerPid = message.loadPid;
      if (!isAbsolute(message.modulePath)) throw new Error("HTTP modulePath must be absolute");
      const mod = await import(pathToFileURL(message.modulePath).href);
      const render = mod.renderHtml ?? (typeof mod.renderCase === "function" ? (caseId, n) => mod.renderCase(caseId, n).html : null);
      if (typeof render !== "function") throw new Error("HTTP module must export renderHtml or renderCase");
      server = createServer((_request, response) => {
        try {
          const html = render(message.caseId, message.n);
          if (typeof html !== "string" || html.length === 0) throw new Error("HTTP render must return a nonempty string");
          response.setHeader("content-type", "text/html");
          response.end(html);
        } catch (error) {
          renderErrors++;
          firstRenderError ??= String(error?.stack ?? error);
          response.statusCode = 500;
          response.setHeader("content-type", "text/plain");
          response.end("SSR render failed");
        }
      });
      server.on("error", (error) => send({ type: "failure", error: String(error.stack ?? error) }));
      server.listen(0, "127.0.0.1", () => send({ type: "ready", port: server.address().port }));
    } else if (message.type === "metrics-start") {
      cpuStart = process.cpuUsage();
      send({ type: "metrics-started" });
    } else if (message.type === "metrics-end") {
      send({ type: "metrics", serverCpuUsage: process.cpuUsage(cpuStart), serverMemory: process.memoryUsage(), renderErrors, firstRenderError });
    } else if (message.type === "shutdown") shutdown();
  } catch (error) {
    send({ type: "failure", error: String(error.stack ?? error) });
  }
});
