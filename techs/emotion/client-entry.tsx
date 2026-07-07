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
// hydrating SSR markup. The cold-mount measurements (mount, mount-attribution) use this.
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
    if (isMount) window.__mountMs = ms;
    else window.__hydrateMs = ms;
    bump = () => setTick((t) => t + 1);
  }, []);
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  return React.createElement(React.Fragment, null, children);
}

let start = 0;
function hydrate() {
  start = performance.now();
  if (render) hydrateRoot(document.getElementById("root")!, React.createElement(App));
}
// Cold mount: createRoot into the empty root — the first render the user would see after
// a "click", including each runtime lib's first style injection into the document.
function mount() {
  start = performance.now();
  if (render) createRoot(document.getElementById("root")!).render(React.createElement(App));
}
// mount + mount-attribution serve an empty root and trigger window.__mount() themselves, so
// the CPU profiler scopes its samples to exactly the cold-mount commit. hydrate-attribution
// loads with ?manual=1 and calls window.__hydrate() for the same reason. Every other consumer
// (hydrate timing, inp) hydrates immediately on load.
if (isMount) window.__mount = mount;
else if (params.get("manual") === "1") window.__hydrate = hydrate;
else hydrate();

// flushSync forces the synchronous re-render (each instance re-runs its lib's runtime),
// then rAF waits for the paint → click-to-next-paint latency.
window.__inp = () =>
  new Promise<number>((resolve) => {
    const t0 = performance.now();
    flushSync(() => bump?.());
    requestAnimationFrame(() => resolve(performance.now() - t0));
  });
