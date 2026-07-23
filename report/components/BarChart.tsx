import React from "react";
import { groupBreaks } from "../stats.ts";
import { TechLabel } from "./TechLabel.tsx";

export interface Bar {
  tech: string;
  label: string;
  color: string;
  value: number;
  /** relative spread (fraction of value) for the ± hint */
  spread: number;
  /** normalized cost — ms per 1,000 DOM elements — so heavy and light workloads compare */
  msPer1kElems?: number;
}

// A horizontal bar per tech, sorted fastest-first by the report (§10.8). Each row
// carries data-tech so the tech filter can hide it across every chart with no JS
// re-layout. `unit`/`higherBetter` are presentation only.
export function BarChart({ bars, unit, higherBetter }: { bars: Bar[]; unit: string; higherBetter: boolean }) {
  const sorted = [...bars].sort((a, b) => (higherBetter ? b.value - a.value : a.value - b.value));
  const max = Math.max(1, ...sorted.map((b) => b.value));
  const best = higherBetter ? Math.max(...sorted.map((b) => b.value)) : Math.min(...sorted.map((b) => b.value));
  const breaks = groupBreaks(sorted.map((b) => b.value)); // gap before a row that jumps a tier
  return (
    <div className="bars">
      {sorted.map((b, i) => (
        <div className={"bar-row" + (breaks[i] ? " gap-before" : "")} data-tech={b.tech} key={b.tech}>
          <span className="bar-label"><TechLabel tech={b.tech} label={b.label} /></span>
          <span className="bar-track">
            <span className="bar-fill" data-val={b.value} style={{ width: `${(b.value / max) * 100}%`, background: b.color }} />
          </span>
          <span className={"bar-val" + (b.value === best ? " bar-best" : "")}>
            {Math.round(b.value).toLocaleString()}
            <span className="bar-unit"> {unit}</span>
            {b.spread > 0 ? <span className="bar-spread"> ±{Math.round(b.spread * 100)}%</span> : null}
            {b.msPer1kElems !== undefined ? <span className="bar-breakdown">({b.msPer1kElems.toFixed(2)} ms / 1k elems)</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
