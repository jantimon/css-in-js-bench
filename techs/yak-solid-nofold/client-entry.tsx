// Hydrate or mount the case, then measure a warm input change from i to i + 1.
// The index accessor reads a signal; __prepareInp resets it outside the timed sample.
import { createSignal, flush } from "solid-js";
import { hydrate, render } from "@solidjs/web";
import type { SolidRenderCase } from "../../report/types";
import { installInteraction } from "../../scripts/interaction";

// Solid's hydration bootstrap. In production this ships as an inline <script> in the
// document (generateHydrationScript): it creates the `_$HY` store the client runtime
// reads and starts capturing clicks/inputs so events fired before hydration can be
// replayed. The benchmark's SSR markup is component markup only — there is no document
// to put it in — so the identical bootstrap runs here, first thing in the bundle. Both
// Solid lanes carry it, so it cancels out of the marginal-JS comparison exactly as
// react-dom's own runtime does for the React lanes.
type HydrationStore = { events: [Element, Event][] | null; completed: WeakSet<Element>; r: Record<string, unknown>; fe(): void };
const globals = globalThis as unknown as { _$HY?: HydrationStore };
if (!globals._$HY) {
  const hy: HydrationStore = { events: [], completed: new WeakSet<Element>(), r: {}, fe() {} };
  globals._$HY = hy;
  const owner = (node: Node | null): Element | null => {
    const el = node as Element | null;
    if (!el || !el.hasAttribute) return null;
    return el.hasAttribute("_hk") ? el : owner((el as unknown as { host?: Node }).host?.nodeType ? (el as unknown as { host: Node }).host : el.parentNode);
  };
  for (const name of ["click", "input"])
    document.addEventListener(name, (e) => {
      if (!hy.events) return;
      const el = owner(e.composedPath?.()[0] ?? e.target);
      if (el && !hy.completed.has(el)) hy.events.push([el, e]);
    });
}

const renders = import.meta.glob<{ default: SolidRenderCase }>("./case/*/index.tsx", { eager: true });

const params = new URLSearchParams(location.search);
const caseId = params.get("case") ?? "";
const n = Number(params.get("n") ?? "1");
const renderCase = renders[`./case/${caseId}/index.tsx`]?.default;
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

// The interaction driver: every instance's index reads this, so one write moves the
// whole mounted workload.
const [offset, setOffset] = createSignal(0);

// The workload, built exactly as ssr-entry.tsx builds it — same shape, same order, so
// the hydration ids the client walks line up with the ones the server stamped. Nothing
// else may live in this tree: an extra effect or component here would shift the id
// allocation and the hydration walk would miss its nodes.
const workload = () => Array.from({ length: n }, (_, i) => renderCase!(() => i + offset()));

// Solid's render/hydrate attach synchronously (the tail flush drains the queued attach),
// so the commit is complete when the call returns — no effect hook needed to observe it,
// and adding one would perturb the hydration ids. A wpd span for the commit: measure
// back to the start mark, so `wpd record --bench --breakdown` gets a "hydrate"/"mount"
// span whose wall === the number this entry reports.
function commit(phase: "hydrate" | "mount", run: () => void) {
  const start = performance.now();
  performance.mark(`${phase}:start`);
  run();
  flush();
  const ms = performance.now() - start;
  if (phase === "mount") window.__mountMs = ms;
  else window.__hydrateMs = ms;
  performance.mark(`${phase}:end`);
  performance.measure(phase, `${phase}:start`, `${phase}:end`);
}

const hydrateRoot = () => commit("hydrate", () => hydrate(workload, document.getElementById("root")!));
// Cold mount: render into the empty root — the first render the user would see after a
// "click", including any first-time style injection into the document.
const mountRoot = () => commit("mount", () => render(workload, document.getElementById("root")!));

// WPD mount serves an empty root and triggers window.__mount(); WPD hydrate loads with
// ?manual=1 and calls window.__hydrate(). The repeated hydrate/INP paths hydrate on load.
if (!renderCase) {
  // no such case in this lane — leave the hooks unset, the harness skips the cell
} else if (isMount) window.__mount = mountRoot;
else if (params.get("manual") === "1") window.__hydrate = hydrateRoot;
else hydrateRoot();

installInteraction((value) => {
  if (window.__hydrateMs === undefined && window.__mountMs === undefined)
    throw new Error("Interaction requires a mounted workload");
  flush(() => setOffset(value));
});
