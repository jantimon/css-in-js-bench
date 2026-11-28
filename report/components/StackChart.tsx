import React from "react";
import { Axis, scaleFor } from "./Axis.tsx";
import { groupBreaks } from "../stats.ts";
import { BarTip, pct, tipRow } from "./BarTip.tsx";
import { TechLabel } from "./TechLabel.tsx";

export interface StackSeg {
  label: string;
  color: string;
}
export interface StackRow {
  tech: string;
  label: string;
  total: number;
  /** per-segment values, aligned to the `segs` order */
  values: number[];
}

// A horizontal bar per lane split into labelled segments (e.g. payload = JS · CSS · HTML),
// so you see the composition, not just the total. Sorted by total; segment widths are a
// fraction of the largest total so bars stay comparable. Reuses the `.attr` stacked-track
// styles + the cluster-gap logic. Each row carries data-tech for the global filter.
export function StackChart({ rows, segs, unit, higherBetter }: { rows: StackRow[]; segs: StackSeg[]; unit: string; higherBetter: boolean }) {
  const sorted = [...rows].sort((a, b) => (higherBetter ? b.total - a.total : a.total - b.total));
  const div = unit === "B" ? 1024 : 1;
  const sc = scaleFor(Math.max(...sorted.map((r) => r.total)), div);
  const max = sc.top;
  const best = higherBetter ? max : Math.min(...sorted.map((r) => r.total));
  const breaks = groupBreaks(sorted.map((r) => r.total));
  // per-segment breakdown after the total: bytes read better as compact kB, anything else
  // in its own unit. Each number is tinted its segment colour.
  const fmtSeg = (v: number) => (unit === "B" ? (v / 1024).toFixed(1) : Math.round(v).toLocaleString());
  const segUnit = unit === "B" ? "kB" : unit;
  return (
    <>
      <div className="attr-legend">
        {segs.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    <div className="attr ax">
      {sorted.map((r, ri) => (
        <div className={"bar-row" + (breaks[ri] ? " gap-before" : "")} data-tech={r.tech} key={r.tech} {...tipRow}>
          <BarTip
            title={r.label}
            tech={r.tech}
            lines={[
              ...segs.map((s, i) => ({ label: s.label, color: s.color, value: `${fmtSeg(r.values[i])} ${segUnit} · ${pct(r.values[i], r.total)}` })),
              { label: "total", value: `${fmtSeg(r.total)} ${segUnit}` },
            ]}
            rank={{ value: r.total, unit: segUnit, higherBetter, index: ri, rows: sorted.map((s) => ({ value: s.total, label: s.label })) }}
          />
          <span className="bar-label"><TechLabel tech={r.tech} label={r.label} /></span>
          <span className="bar-track">
            {r.values.map((v, i) =>
              v > 0 ? <span key={segs[i].label} className="attr-seg" data-val={v} style={{ width: `${(v / max) * 100}%`, background: segs[i].color }} /> : null,
            )}
          </span>
          <span className={"bar-val" + (r.total === best ? " bar-best" : "")}>
            {fmtSeg(r.total)}
            <span className="bar-unit"> {segUnit}</span>
          </span>
        </div>
      ))}
      <Axis {...sc} unit={segUnit} div={div} />
    </div>
    </>
  );
}
