import React from "react";
import { groupBreaks } from "../stats.ts";
import { TechLabel } from "./TechLabel.tsx";

export interface BuildTimeRow {
  tech: string;
  label: string;
  color: string;
  /** how this lane's CSS exists (extracted / atomic / utility / runtime / none) — the "CSS" context column */
  cssKind: string;
  /** median cold build (cleared caches) in ms — the headline bar */
  coldMs: number;
  /** relative spread of the cold samples (fraction) for the ± hint */
  coldSpread: number;
  /** median warm build (immediate repeat) in ms — context, may be absent on old data */
  warmMs?: number;
}

// One horizontal bar per LANE (not per case) — cold build time, fastest first. Reuses the
// shared `.bars` grid so the tech filter (data-tech) and the controller's width rescale work
// for free. cssKind and the warm time ride along as context in the value cell.
export function BuildTimeChart({ rows }: { rows: BuildTimeRow[] }) {
  const sorted = [...rows].sort((a, b) => a.coldMs - b.coldMs);
  const max = Math.max(1, ...sorted.map((r) => r.coldMs));
  const best = Math.min(...sorted.map((r) => r.coldMs));
  const breaks = groupBreaks(sorted.map((r) => r.coldMs));
  return (
    <div className="bars">
      {sorted.map((r, i) => (
        <div className={"bar-row" + (breaks[i] ? " gap-before" : "")} data-tech={r.tech} key={r.tech}>
          <span className="bar-label"><TechLabel tech={r.tech} label={r.label} /></span>
          <span className="bar-track">
            <span className="bar-fill" data-val={r.coldMs} style={{ width: `${(r.coldMs / max) * 100}%`, background: r.color }} />
          </span>
          <span className={"bar-val" + (r.coldMs === best ? " bar-best" : "")}>
            {Math.round(r.coldMs).toLocaleString()}
            <span className="bar-unit"> ms</span>
            {r.coldSpread > 0 ? <span className="bar-spread"> ±{Math.round(r.coldSpread * 100)}%</span> : null}
            <span className="bar-breakdown">
              <span className="bd-kind">{r.cssKind}</span>
              {r.warmMs !== undefined ? (
                <>
                  <span className="bd-sep"> · </span>warm {Math.round(r.warmMs).toLocaleString()} ms
                </>
              ) : null}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
