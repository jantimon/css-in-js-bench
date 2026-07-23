// Browser entry for the hydrate + inp + mount measurements. It hydrates the SAME n
// instances the SSR markup contains (renderHtml produced that markup; this re-attaches
// React to it) and records the hydration time (window.__hydrateMs). It also exposes
// window.__inp (re-render the SAME mounted workload in place, click→next-paint) and
// window.__mount (render the workload into an EMPTY root from scratch — a cold client
// mount whose first paint includes the library's first-time style injection).
//
// UNIFORM across every tech — only the case modules it discovers differ — so the tree it
// hydrates/re-renders/mounts always matches what that tech's ssr-entry rendered.
import React, { useEffect, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

const params = new URLSearchParams(location.search);
const caseId = params.get("case") ?? "";
const n = Number(params.get("n") ?? "1");
const render = renders[`./case/${caseId}/index.tsx`]?.default;
// mount mode: the server serves an EMPTY root and we render into it on demand instead of
// hydrating SSR markup. The cold-mount measurement uses this.
const isMount = params.get("mount") === "1";

declare global {
  interface Window {
    __hydrateMs?: number;
    __mountMs?: number;
    __inp?: () => Promise<number>;
    __hydrate?: () => void;
    __mount?: () => void;
  }
}

let bump: (() => void) | null = null;

function App() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const ms = performance.now() - start;
    // A wpd span for the commit: mark the end and measure back to the start mark set in
    // hydrate()/mount(). Under `wpd record --bench --breakdown` this "hydrate"/"mount" measure
    // becomes a span with the reconciling seven-slice bar; the wall of the span === this ms, so
    // the bench's own commit number stays derivable while wpd adds the anatomy.
    const phase = isMount ? "mount" : "hydrate";
    if (isMount) window.__mountMs = ms;
    else window.__hydrateMs = ms;
    performance.mark(`${phase}:end`);
    performance.measure(phase, `${phase}:start`, `${phase}:end`);
    bump = () => setTick((t) => t + 1);
  }, []);
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  return React.createElement(React.Fragment, null, children);
}

let start = 0;
function hydrate() {
  start = performance.now();
  performance.mark("hydrate:start");
  if (render) hydrateRoot(document.getElementById("root")!, React.createElement(App));
}
// Cold mount: createRoot into the empty root — the first render the user would see after
// a "click", including each runtime lib's first style injection into the document.
function mount() {
  start = performance.now();
  performance.mark("mount:start");
  if (render) createRoot(document.getElementById("root")!).render(React.createElement(App));
}
// WPD mount serves an empty root and triggers window.__mount(); WPD hydrate loads with
// ?manual=1 and calls window.__hydrate(). The repeated hydrate/INP paths hydrate on load.
if (isMount) window.__mount = mount;
else if (params.get("manual") === "1") window.__hydrate = hydrate;
else hydrate();

// flushSync forces the synchronous re-render (each instance re-runs its lib's runtime),
// then rAF waits for the paint → click-to-next-paint latency.
window.__inp = () =>
  new Promise<number>((resolve) => {
    const t0 = performance.now();
    // A wpd span for the in-place re-render: mark before the flushSync commit and after the
    // next frame lands, so the "inp" measure spans flushSync + one rAF. Under
    // `wpd record --bench --breakdown` the rAF wait shows up as an explicit idle slice, which is
    // exactly the frame-floor time gen's single __inp number could never separate from the work.
    performance.mark("inp:start");
    flushSync(() => bump?.());
    requestAnimationFrame(() => {
      const wall = performance.now() - t0;
      performance.mark("inp:end");
      performance.measure("inp", "inp:start", "inp:end");
      resolve(wall);
    });
  });
