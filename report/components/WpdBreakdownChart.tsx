import React from "react";
import { groupBreaks } from "../stats.ts";
import type { WpdBrowserSample, WpdSpanSample } from "../types.ts";
import { TechLabel } from "./TechLabel.tsx";

export interface WpdBreakdownRow {
  tech: string;
  label: string;
  span: WpdSpanSample;
  medianMs?: number;
  timing: WpdBrowserSample["timing"];
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
              return value !== null && value > 0 ? <span key={key} className="attr-seg" data-val={value} title={`${key}: ${value.toFixed(2)} ms`} style={{ width: `${(value / max) * 100}%`, background: color }} /> : null;
            })}
          </span>
          <span className="bar-val">
            {activeMs(row).toFixed(2)}<span className="bar-unit"> ms active</span>
            <span className="bar-breakdown" title={row.timing?.stats ? `${row.timing.samplesMs.length} ${row.timing.sampleUnit} samples; ${row.timing.stats.minMs.toFixed(2)}–${row.timing.stats.maxMs.toFixed(2)} ms; ${row.timing.boundary}; ${row.timing.clock ?? "unknown"} clock` : undefined}>({row.span.wallMs.toFixed(2)} ms span{row.medianMs !== undefined ? ` · ${row.medianMs.toFixed(2)} ms profiled median (n=${row.timing?.samplesMs.length})` : ""})</span>
          </span>
        </div>
      ))}
      <p className="rt-note">
        Chrome profile (web-performance-debugger {wpdVersion}); segments sum to the span wall time. Rank uses active time (wall minus idle).
        Each bar describes one named action, including its frame waits. Repeated actions use the occurrence with the lower-median profile duration.
        The timing median uses all recorded action durations and includes profiler overhead. The main timing charts use separate measurements.
      </p>
    </div>
  );
}
