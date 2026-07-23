import React from "react";
import { groupBreaks } from "../stats.ts";
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
  const max = Math.max(1, ...sorted.map((r) => r.total));
  const best = higherBetter ? max : Math.min(...sorted.map((r) => r.total));
  const breaks = groupBreaks(sorted.map((r) => r.total));
  // per-segment breakdown after the total: bytes read better as compact kB, anything else
  // in its own unit. Each number is tinted its segment colour.
  const fmtSeg = (v: number) => (unit === "B" ? (v / 1024).toFixed(1) : Math.round(v).toLocaleString());
  const segUnit = unit === "B" ? "kB" : unit;
  return (
    <div className="attr">
      <div className="attr-legend">
        {segs.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      {sorted.map((r, ri) => (
        <div className={"bar-row" + (breaks[ri] ? " gap-before" : "")} data-tech={r.tech} key={r.tech}>
          <span className="bar-label"><TechLabel tech={r.tech} label={r.label} /></span>
          <span className="bar-track">
            {r.values.map((v, i) =>
              v > 0 ? <span key={segs[i].label} className="attr-seg" data-val={v} title={`${segs[i].label}: ${Math.round(v).toLocaleString()} ${unit}`} style={{ width: `${(v / max) * 100}%`, background: segs[i].color }} /> : null,
            )}
          </span>
          <span className={"bar-val" + (r.total === best ? " bar-best" : "")}>
            {Math.round(r.total).toLocaleString()}
            <span className="bar-unit"> {unit}</span>
            <span className="bar-breakdown">
              {"("}
              {r.values.map((v, i) => (
                <React.Fragment key={segs[i].label}>
                  {i > 0 ? <span className="bd-sep"> / </span> : null}
                  <span style={{ color: segs[i].color }}>{fmtSeg(v)}</span>
                </React.Fragment>
              ))}
              <span className="bd-sep"> {segUnit})</span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
