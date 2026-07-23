import React from "react";
import { groupBreaks } from "../stats.ts";
import type { WpdSpanSample } from "../types.ts";
import { TechLabel } from "./TechLabel.tsx";

export interface WpdBreakdownRow {
  tech: string;
  label: string;
  span: WpdSpanSample;
  medianMs?: number;
  /** tail latency over the repeated iterations — the frames a user actually notices */
  p75Ms?: number;
  p95Ms?: number;
}

const SEGMENTS = [
  ["js", "#4c6ef5", "JavaScript"],
  ["style", "#e8590c", "style"],
  ["layout", "#7950f2", "layout"],
  ["paint", "#12b886", "paint"],
  ["gc", "#f59f00", "GC"],
  ["other", "#868e96", "browser / other"],
  ["idle", "#343a40", "idle / frame wait"],
] as const;

const activeMs = (row: WpdBreakdownRow) => row.span.wallMs - row.span.slices.idle;

/** WPD's reconciling browser span: every segment sums exactly to the measured wall. */
export function WpdBreakdownChart({ rows, wpdVersion }: { rows: WpdBreakdownRow[]; wpdVersion: string }) {
  const sorted = [...rows].sort((a, b) => activeMs(a) - activeMs(b));
  const max = Math.max(1e-6, ...sorted.map((row) => row.span.wallMs));
  const breaks = groupBreaks(sorted.map(activeMs));
  return (
    <div className="attr wpd-breakdown">
      <div className="attr-legend">
        {SEGMENTS.map(([key, color, label]) => (
          <span key={key}><i style={{ background: color }} />{label}</span>
        ))}
      </div>
      {sorted.map((row, index) => (
        <div className={"bar-row" + (breaks[index] ? " gap-before" : "")} data-tech={row.tech} key={row.tech}>
          <span className="bar-label"><TechLabel tech={row.tech} label={row.label} /></span>
          <span className="bar-track">
            {SEGMENTS.map(([key, color]) => {
              const value = row.span.slices[key];
              return value > 0 ? <span key={key} className="attr-seg" data-val={value} title={`${key}: ${value.toFixed(2)} ms`} style={{ width: `${(value / max) * 100}%`, background: color }} /> : null;
            })}
          </span>
          <span className="bar-val">
            {activeMs(row).toFixed(2)}<span className="bar-unit"> ms active</span>
            <span className="bar-breakdown">({row.span.wallMs.toFixed(2)} ms span{row.medianMs !== undefined ? ` · ${row.medianMs.toFixed(2)} ms median` : ""}{row.p95Ms !== undefined ? ` · p95 ${row.p95Ms.toFixed(2)}` : ""})</span>
          </span>
        </div>
      ))}
      <p className="rt-note">
        Chrome-profiled first-span anatomy (web-performance-debugger {wpdVersion}); segments reconcile exactly to span wall. Rank uses active time (wall minus idle).
        Repeated timing median is shown when available; slice anatomy is retained for the first iteration only.
      </p>
    </div>
  );
}
