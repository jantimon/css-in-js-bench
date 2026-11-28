import React from "react";
import type { RenderTimingMetrics } from "../types.ts";
import { BarTip, pct, tipRow } from "./BarTip.tsx";
import { EmptyRow } from "./BarChart.tsx";
import { TechLabel } from "./TechLabel.tsx";

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
  const sorted = [...rows].sort((a, b) => (a.chrome ? sumSegs(a.chrome, CHROME_SEGS) : Infinity) - (b.chrome ? sumSegs(b.chrome, CHROME_SEGS) : Infinity));
  const totals: number[] = [];
  for (const r of sorted) {
    if (r.chrome) totals.push(sumSegs(r.chrome, CHROME_SEGS));
    if (r.firefox) totals.push(sumSegs(r.firefox, FF_SEGS));
  }
  // One scale for both engines (the client keeps it shared through data-shared-scale).
  const max = Math.max(1e-6, ...totals);
  const noForcedLayouts = sorted.length > 0 && sorted.every((row) => row.chrome?.forcedLayoutCount === 0 && row.firefox?.forcedLayoutCount === 0);
  const hasFirefox = sorted.some((r) => r.firefox);

  const engineRow = (r: RenderTimingRow, engine: "Chrome" | "Firefox", m: RenderTimingMetrics | undefined, segs: readonly Seg[]) => {
    if (!m) return <EmptyRow tech={r.tech} label={engine === "Chrome" ? r.label : undefined} key={r.tech} />;
    const total = sumSegs(m, segs);
    return (
      <div className="bar-row" data-tech={r.tech} key={r.tech} {...tipRow}>
        <BarTip
          title={`${r.label} · ${engine}`}
          tech={r.tech}
          lines={[
            ...segs.map(([k, c, label]) => {
              const ms = typeof m[k] === "number" ? (m[k] as number) : 0;
              return { label, color: c, value: `${ms.toFixed(1)} ms · ${pct(ms, total)}` };
            }),
            { label: "total", value: `${total.toFixed(1)} ms` },
            ...(engine === "Chrome" && typeof m.styleCount === "number" ? [{ label: "style recalcs", value: String(m.styleCount) }] : []),
          ]}
          note={`cold mount of ${r.n.toLocaleString()} instances`}
        />
        <span className="bar-label"><TechLabel tech={r.tech} label={r.label} /></span>
        <span className="bar-track">
          {segs.map(([k, c]) => {
            const ms = typeof m[k] === "number" ? (m[k] as number) : 0;
            return ms > 0 ? <span key={k} className="attr-seg" data-val={ms} style={{ width: `${(ms / max) * 100}%`, background: c }} /> : null;
          })}
        </span>
        <span className="bar-val">
          {total.toFixed(1)}
          <span className="bar-unit"> ms</span>
          {engine === "Chrome" && typeof m.styleCount === "number" && m.styleCount !== 1 ? (
            <span className="rt-badge">{m.styleCount} recalcs</span>
          ) : null}
        </span>
      </div>
    );
  };

  return (
    <div className="rt">
      <div className="attr-legend pair-legend">
        <span><i style={{ background: "#e8590c" }} />style recalc</span>
        <span><i style={{ background: "#4c6ef5" }} />layout</span>
        <span><i style={{ background: "#12b886" }} />paint (Chrome only)</span>
      </div>
      <div className={hasFirefox ? "pair" : ""} data-shared-scale>
        <div className="pair-col">
          {hasFirefox ? <div className="pair-head">Chrome</div> : null}
          <div className="attr">{sorted.map((r) => engineRow(r, "Chrome", r.chrome, CHROME_SEGS))}</div>
        </div>
        {hasFirefox ? (
          <div className="pair-col pair-r">
            <div className="pair-head">Firefox</div>
            <div className="attr">{sorted.map((r) => engineRow(r, "Firefox", r.firefox, FF_SEGS))}</div>
          </div>
        ) : null}
      </div>
      <p className="rt-note">
        {noForcedLayouts ? <><b>No forced layouts observed.</b>{" "}</> : null}
        Cold mount of {sorted[0]?.n ?? 0} instances, one scale for both browsers. Chrome recalculated styles once per mount
        unless a badge shows another count. Firefox samples style and layout time and reports no main-thread paint, so a
        zero can mean "not sampled".
      </p>
    </div>
  );
}
