// Hydrate or mount the case, then measure a warm input change from i to i + 1.
// Instance keys stay fixed. __prepareInp resets the input outside the timed sample.
import React, { useLayoutEffect, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { cacheKey } from "./cache-key";
import type { RenderCase } from "../../report/types";
import { installInteraction } from "../../scripts/interaction";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

const params = new URLSearchParams(location.search);
const caseId = params.get("case") ?? "";
const n = Number(params.get("n") ?? "1");
const render = renders[`./case/${caseId}/index.tsx`]?.default;
// mount mode: the server serves an EMPTY root and we render into it on demand instead of
// hydrating SSR markup. The cold-mount measurement uses this.
const isMount = params.get("mount") === "1";
const cache = createCache({ key: cacheKey });

declare global {
  interface Window {
    __hydrateMs?: number;
    __mountMs?: number;
    __inp?: () => Promise<number>;
    __hydrate?: () => void;
    __mount?: () => void;
  }
}

let updateOffset: ((offset: number) => void) | null = null;

function App() {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const ms = performance.now() - start;
    // Stop at DOM commit, before paint, as the Solid entries do after flush.
    const phase = isMount ? "mount" : "hydrate";
    if (isMount) window.__mountMs = ms;
    else window.__hydrateMs = ms;
    performance.mark(`${phase}:end`);
    performance.measure(phase, `${phase}:start`, `${phase}:end`);
    updateOffset = setOffset;
  }, []);
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i + offset)));
  return React.createElement(React.Fragment, null, children);
}

let start = 0;
function hydrate() {
  start = performance.now();
  performance.mark("hydrate:start");
  if (render) hydrateRoot(document.getElementById("root")!, React.createElement(CacheProvider, { value: cache }, React.createElement(App)));
}
// Cold mount: createRoot into the empty root — the first render the user would see after
// a "click", including each runtime lib's first style injection into the document.
function mount() {
  start = performance.now();
  performance.mark("mount:start");
  if (render) createRoot(document.getElementById("root")!).render(React.createElement(CacheProvider, { value: cache }, React.createElement(App)));
}
// WPD mount serves an empty root and triggers window.__mount(); WPD hydrate loads with
// ?manual=1 and calls window.__hydrate(). The repeated hydrate/INP paths hydrate on load.
if (isMount) window.__mount = mount;
else if (params.get("manual") === "1") window.__hydrate = hydrate;
else hydrate();

installInteraction((value) => {
  if (!updateOffset) throw new Error("Interaction requires a mounted workload");
  flushSync(() => updateOffset!(value));
});
