import React from "react";
import { defaultShown } from "../default-lanes.ts";
import { Axis, scaleFor } from "./Axis.tsx";
import { groupBreaks } from "../stats.ts";
import { BarTip, pct, tipRow } from "./BarTip.tsx";
import { TechLabel } from "./TechLabel.tsx";

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
  ["react", "#4c6ef5", "UI framework (React or Solid)"],
  ["lib", "#e8590c", "styling library runtime"],
  ["component", "#868e96", "your component"],
] as const;

// "Where the time goes" — per lane, a horizontal bar split into the median render's
// per-bucket self-time (§ attribution). The UI framework — react-dom for most lanes, solid
// for the Solid ones — is the floor every lane of that framework shares; the spread is the
// library's own per-render work. Reused for the SSR render split and the two
// browser splits (hydration / interaction) — only the `other` label differs (node vs
// browser). Sorted fastest-first; each row carries data-tech for the global filter.
export function AttributionChart({ rows, otherLabel = "other (garbage collection, Node)" }: { rows: AttrRow[]; otherLabel?: string }) {
  const rowSum = (r: AttrRow) => r.react + r.lib + r.component + r.other;
  const BUCKETS = [...BUCKET_DEFS, ["other", "#545d6a", otherLabel] as const];
  const sorted = [...rows].sort((a, b) => a.renderMs - b.renderMs);
  const sc = scaleFor(Math.max(...defaultShown(sorted).map((r) => r.renderMs)));
  const max = sc.top;
  const breaks = groupBreaks(sorted.map((r) => r.renderMs));
  return (
    <>
    <div className="attr ax">
      {sorted.map((r, i) => (
        <div className={"bar-row" + (breaks[i] ? " gap-before" : "")} data-tech={r.tech} key={r.tech} {...tipRow}>
          <BarTip
            title={r.label}
            tech={r.tech}
            lines={[
              ...BUCKETS.map(([k, c, label]) => ({ label, color: c, value: `${(r[k] as number).toFixed(2)} ms · ${pct(r[k] as number, r.renderMs)}` })),
              { label: "median render", value: `${r.renderMs.toFixed(2)} ms` },
            ]}
            rank={{ value: r.renderMs, unit: "ms", higherBetter: false, index: i, rows: sorted.map((s) => ({ value: s.renderMs, label: s.label })) }}
          />
          <span className="bar-label"><TechLabel tech={r.tech} label={r.label} /></span>
          <span className="bar-track">
            <span className="attr-fill" data-val={rowSum(r)} style={{ width: `${(rowSum(r) / max) * 100}%` }}>
              {BUCKETS.map(([k, c]) => {
                const ms = r[k] as number;
                return ms > 0 ? <span key={k} className="attr-seg" style={{ width: `${(ms / rowSum(r)) * 100}%`, background: c }} /> : null;
              })}
            </span>
          </span>
          <span className="bar-val">
            {r.renderMs.toFixed(2)}
            <span className="bar-unit"> ms</span>
          </span>
        </div>
      ))}
      <Axis {...sc} unit="ms" />
    </div>
      <div className="attr-legend">
        {BUCKETS.map(([k, c, label]) => (
          <span key={k}>
            <i style={{ background: c }} />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
