import React from "react";
import { groupBreaks } from "../stats.ts";

export interface AttrRow {
  tech: string;
  label: string;
  renderMs: number;
  react: number;
  lib: number;
  component: number;
  other: number;
}

const BUCKET_DEFS = [
  ["react", "#4c6ef5", "react-dom (the shared floor)"],
  ["lib", "#e8590c", "styling library runtime"],
  ["component", "#868e96", "your component"],
] as const;

// "Where the time goes" — per lane, a horizontal bar split into the median render's
// per-bucket self-time (§ attribution). react-dom is the floor every lane shares; the
// spread is the library's own per-render work. Reused for the SSR render split and the two
// browser splits (hydration / interaction) — only the `other` label differs (node vs
// browser). Sorted fastest-first; each row carries data-tech for the global filter.
export function AttributionChart({ rows, otherLabel = "node / gc / unattributed" }: { rows: AttrRow[]; otherLabel?: string }) {
  const BUCKETS = [...BUCKET_DEFS, ["other", "#343a40", otherLabel] as const];
  const sorted = [...rows].sort((a, b) => a.renderMs - b.renderMs);
  const max = Math.max(1e-6, ...sorted.map((r) => r.renderMs));
  const breaks = groupBreaks(sorted.map((r) => r.renderMs));
  return (
    <div className="attr">
      <div className="attr-legend">
        {BUCKETS.map(([k, c, label]) => (
          <span key={k}>
            <i style={{ background: c }} />
            {label}
          </span>
        ))}
      </div>
      {sorted.map((r, i) => (
        <div className={"bar-row" + (breaks[i] ? " gap-before" : "")} data-tech={r.tech} key={r.tech}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            {BUCKETS.map(([k, c]) => {
              const ms = r[k] as number;
              return ms > 0 ? <span key={k} className="attr-seg" data-val={ms} style={{ width: `${(ms / max) * 100}%`, background: c }} /> : null;
            })}
          </span>
          <span className="bar-val">
            {r.renderMs.toFixed(2)}
            <span className="bar-unit"> ms</span>
          </span>
        </div>
      ))}
    </div>
  );
}
