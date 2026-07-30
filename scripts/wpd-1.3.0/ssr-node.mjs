// Node-lane SSR probe for one CSS-in-JS lane + case.
//
// wpd `--target node` imports this module and profiles run() in-process (no
// browser, no DOM) — exactly where React SSR runs in production. run() renders
// one case's whole workload (n instances) once; --iterations repeats it.
//
// Env (set by run-node.sh): WPD_LANE, WPD_CASE, WPD_N.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const lane = process.env.WPD_LANE;
const caseId = process.env.WPD_CASE;
const instanceCount = Number(process.env.WPD_N);
if (!lane || !caseId || !Number.isFinite(instanceCount)) {
  throw new Error("set WPD_LANE, WPD_CASE, WPD_N before recording");
}

const entryPath = resolve(process.cwd(), "techs", lane, "dist/microbench/entry.mjs");
const entry = await import(pathToFileURL(entryPath).href);

// Fair render-cost comparison: a lane whose CSS is produced by a separate
// build-time step (Tailwind JIT, an atomic sheet slice) exports renderHtml, which
// renders markup ONLY and leaves CSS extraction out of the timed window. Runtime
// CSS-in-JS lanes inject CSS as a byproduct of render, so they only export
// renderCase and the CSS cost is inherently part of the render. Set
// WPD_FORCE_RENDERCASE=1 to instead time render + CSS production for every lane.
const forceRenderCase = process.env.WPD_FORCE_RENDERCASE === "1";
const render =
  !forceRenderCase && typeof entry.renderHtml === "function"
    ? () => entry.renderHtml(caseId, instanceCount)
    : () => entry.renderCase(caseId, instanceCount);

export function run() {
  render();
}
