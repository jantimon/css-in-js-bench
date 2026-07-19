import React from "react";
import type { RenderTimingMetrics } from "../types.ts";

export interface RenderTimingRow {
  tech: string;
  label: string;
  n: number;
  chrome?: RenderTimingMetrics;
  firefox?: RenderTimingMetrics;
}

// Per-engine stacked segments (ms). The two browsers measure render-work DIFFERENTLY, so each
// gets the segments it reports reliably: Chrome splits style-recalc / layout / paint durations
// (and its authoritative signal is the style-recalc COUNT, shown as a badge); Firefox reports
// sampled Gecko style / layout ms (no main-thread paint). Same colour = same
// kind of work across engines so the eye can compare, but they are labelled per browser.
const CHROME_SEGS = [
  ["styleMs", "#e8590c", "style recalc"],
  ["layoutMs", "#4c6ef5", "layout"],
  ["paintMs", "#12b886", "paint"],
] as const;
const FF_SEGS = [
  ["styleMs", "#e8590c", "style"],
  ["layoutMs", "#4c6ef5", "layout"],
] as const;

type Seg = readonly [keyof RenderTimingMetrics, string, string];
const sumSegs = (m: RenderTimingMetrics, segs: readonly Seg[]) => segs.reduce((s, [k]) => s + (typeof m[k] === "number" ? (m[k] as number) : 0), 0);

// Render-work on a COLD MOUNT of the workload, per engine (measured by wpd). Each lane gets a
// Chrome row and (when present) a Firefox row. Bars are ms; Chrome's style-recalc COUNT — the
// clean "one recalc per runtime-injected instance vs one for extracted CSS" signal — rides
// alongside as a badge. Rows carry data-tech for the global lane filter; segments carry data-val
// so the client controller rescales widths to the widest VISIBLE row (shared with AttributionChart).
export function RenderTimingChart({ rows }: { rows: RenderTimingRow[] }) {
  // Slowest-runtime last: order by Chrome style-recalc count (the headline), then Firefox style ms.
  const sorted = [...rows].sort((a, b) => (a.chrome?.styleCount ?? 0) - (b.chrome?.styleCount ?? 0) || (a.firefox?.styleMs ?? 0) - (b.firefox?.styleMs ?? 0));
  // Bake initial widths against the widest row total across every engine row (the controller
  // recomputes this among visible rows on filter, but SSR needs a value up front).
  const totals: number[] = [];
  for (const r of sorted) {
    if (r.chrome) totals.push(sumSegs(r.chrome, CHROME_SEGS));
    if (r.firefox) totals.push(sumSegs(r.firefox, FF_SEGS));
  }
  const max = Math.max(1e-6, ...totals);
  const noForcedLayouts = sorted.length > 0 && sorted.every((row) => row.chrome?.forcedLayoutCount === 0 && row.firefox?.forcedLayoutCount === 0);

  const engineRow = (r: RenderTimingRow, engine: "Chrome" | "Firefox", m: RenderTimingMetrics, segs: readonly Seg[], first: boolean) => {
    const total = sumSegs(m, segs);
    return (
      <div className={"bar-row" + (first ? " gap-before" : "")} data-tech={r.tech} key={`${r.tech}-${engine}`}>
        <span className="bar-label">
          <span className="rt-lane">{first ? r.label : ""}</span>
          <span className="rt-eng">{engine}</span>
        </span>
        <span className="bar-track">
          {segs.map(([k, c]) => {
            const ms = typeof m[k] === "number" ? (m[k] as number) : 0;
            return ms > 0 ? <span key={k} className="attr-seg" data-val={ms} style={{ width: `${(ms / max) * 100}%`, background: c }} /> : null;
          })}
        </span>
        <span className="bar-val">
          {total.toFixed(1)}
          <span className="bar-unit"> ms</span>
          {engine === "Chrome" && typeof m.styleCount === "number" ? (
            <span className="rt-badge" title="Chrome style-recalc count — one per runtime-injected style vs one for extracted CSS">
              {m.styleCount} recalc{m.styleCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </span>
      </div>
    );
  };

  return (
    <div className="attr rt">
      <div className="attr-legend">
        <span><i style={{ background: "#e8590c" }} />style recalc</span>
        <span><i style={{ background: "#4c6ef5" }} />layout</span>
        <span><i style={{ background: "#12b886" }} />paint (Chrome)</span>
      </div>
      {sorted.map((r) => (
        <React.Fragment key={r.tech}>
          {r.chrome ? engineRow(r, "Chrome", r.chrome, CHROME_SEGS, true) : null}
          {r.firefox ? engineRow(r, "Firefox", r.firefox, FF_SEGS, !r.chrome) : null}
        </React.Fragment>
      ))}
      <p className="rt-note">
        {noForcedLayouts ? <><b>No forced layouts observed.</b>{" "}</> : null}
        Cold mount of {sorted[0]?.n ?? 0} instances. Chrome's trustworthy signal is the <b>style-recalc count</b> (badge);
        Firefox reports sampled Gecko style/layout <b>ms</b> but no main-thread paint. A zero sampled slice is not proof
        that no work occurred; Chrome's exact count badges are the reliable presence/absence signal.
      </p>
    </div>
  );
}
