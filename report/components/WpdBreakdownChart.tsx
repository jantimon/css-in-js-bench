import React from "react";
import { groupBreaks } from "../stats.ts";
import type { WpdBrowserSample, WpdSpanSample } from "../types.ts";
import { BarTip, pct, tipRow } from "./BarTip.tsx";
import { TechLabel } from "./TechLabel.tsx";

export interface WpdBreakdownRow {
  tech: string;
  label: string;
  span: WpdSpanSample;
  medianMs?: number;
  timing: WpdBrowserSample["timing"];
}

export const SEGMENTS = [
  ["js", "#4c6ef5", "JavaScript"],
  ["style", "#e8590c", "style"],
  ["layout", "#7950f2", "layout"],
  ["paint", "#12b886", "paint"],
  ["gc", "#f59f00", "GC"],
  ["other", "#868e96", "browser / other"],
  ["idle", "#343a40", "idle / frame wait"],
] as const;

export const activeMs = (row: WpdBreakdownRow) => row.span.wallMs - row.span.slices.idle;

/** The profile as stacked bars: active segments only, scaled to active time; idle frame wait is a number after the bar. */
export function WpdBreakdownChart({ rows }: { rows: WpdBreakdownRow[] }) {
  const sorted = [...rows].sort((a, b) => activeMs(a) - activeMs(b));
  const max = Math.max(1e-6, ...sorted.map(activeMs));
  const breaks = groupBreaks(sorted.map(activeMs));
  const bars = SEGMENTS.filter(([key]) => key !== "idle");
  return (
    <div className="attr wpd-breakdown">
      <div className="attr-legend">
        {bars.map(([key, color, label]) => (
          <span key={key}><i style={{ background: color }} />{label}</span>
        ))}
      </div>
      {sorted.map((row, index) => {
        const median = row.medianMs !== undefined && row.medianMs.toFixed(1) !== row.span.wallMs.toFixed(1) ? row.medianMs : undefined;
        return (
          <div className={"bar-row" + (breaks[index] ? " gap-before" : "")} data-tech={row.tech} key={row.tech} {...tipRow}>
            <BarTip
              title={row.label}
              tech={row.tech}
              lines={[
                ...SEGMENTS.flatMap(([key, color, label]) => {
                  const value = row.span.slices[key];
                  return value === null ? [] : [{ label, color, value: `${value.toFixed(1)} ms · ${pct(value, row.span.wallMs)}` }];
                }),
                { label: "active", value: `${activeMs(row).toFixed(1)} ms` },
                { label: "span", value: `${row.span.wallMs.toFixed(1)} ms` },
                ...(median !== undefined ? [{ label: "profiled median", value: `${median.toFixed(1)} ms` }] : []),
                ...(row.timing?.stats
                  ? [{ label: `${row.timing.samplesMs.length} samples`, value: `${row.timing.stats.minMs.toFixed(1)}–${row.timing.stats.maxMs.toFixed(1)} ms` }]
                  : []),
              ]}
              rank={{ value: activeMs(row), unit: "active ms", higherBetter: false, index, rows: sorted.map((s) => ({ value: activeMs(s), label: s.label })) }}
            />
            <span className="bar-label"><TechLabel tech={row.tech} label={row.label} /></span>
            <span className="bar-track">
              {bars.map(([key, color]) => {
                const value = row.span.slices[key];
                return value !== null && value > 0 ? <span key={key} className="attr-seg" data-val={value} style={{ width: `${(value / max) * 100}%`, background: color }} /> : null;
              })}
            </span>
            <span className="bar-val">
              {activeMs(row).toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
