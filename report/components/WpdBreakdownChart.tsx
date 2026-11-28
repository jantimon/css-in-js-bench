import React from "react";
import { defaultShown } from "../default-lanes.ts";
import { Axis, scaleFor } from "./Axis.tsx";
import { groupBreaks } from "../stats.ts";
import type { WpdBrowserSample, WpdSpanSample } from "../types.ts";
import { BarTip, pct, tipRow } from "./BarTip.tsx";
import { EmptyRow } from "./BarChart.tsx";
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
  ["other", "#868e96", "other"],
  ["idle", "#343a40", "idle / frame wait"],
] as const;

export const activeMs = (row: WpdBreakdownRow) => row.span.wallMs - row.span.slices.idle;

const ACTIVE = SEGMENTS.filter(([key]) => key !== "idle");
const R = 38;
const STROKE = 16;
const C = 2 * Math.PI * R;

/** A DevTools "Summary"-style donut of one profile's active work, the active time in the middle. */
export function Donut({ row }: { row: WpdBreakdownRow }) {
  const total = activeMs(row);
  // Arcs are sized by the sum of the drawn slices, not by span minus idle: the two can differ by
  // rounding or a missing slice, and the ring must close exactly at the top.
  const drawn = ACTIVE.reduce((sum, [key]) => sum + (row.span.slices[key] ?? 0), 0);
  let offset = 0;
  return (
    <svg className="pd-donut" viewBox="0 0 100 100" width={84} height={84} aria-hidden="true">
      <g transform="rotate(-90 50 50)">
        {ACTIVE.map(([key, color]) => {
          const ms = row.span.slices[key];
          if (!ms || drawn <= 0) return null;
          const len = (ms / drawn) * C;
          const arc = <circle key={key} cx={50} cy={50} r={R} fill="none" stroke={color} strokeWidth={STROKE} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return arc;
        })}
      </g>
      <text x={50} y={55} textAnchor="middle" className="pd-center">{total.toFixed(1)} ms</text>
    </svg>
  );
}

/** The profile as stacked bars: active segments only, scaled to active time; idle frame wait is a number after the bar. */
export function WpdBreakdownChart({ rows, order, legend = true }: { rows: WpdBreakdownRow[]; order?: string[]; legend?: boolean }) {
  const byActive = [...rows].sort((a, b) => activeMs(a) - activeMs(b));
  const shown: (WpdBreakdownRow | string)[] = order ? order.map((t) => rows.find((r) => r.tech === t) ?? t) : byActive;
  const sorted = byActive;
  const sc = scaleFor(Math.max(...defaultShown(sorted).map(activeMs)));
  const max = sc.top;
  const breaks = groupBreaks(sorted.map(activeMs));
  const bars = SEGMENTS.filter(([key]) => key !== "idle");
  return (
    <>
    <div className="attr wpd-breakdown ax">
      {shown.map((row) => {
        if (typeof row === "string") return <EmptyRow tech={row} key={row} />;
        const index = byActive.indexOf(row);
        const median = row.medianMs !== undefined && row.medianMs.toFixed(1) !== row.span.wallMs.toFixed(1) ? row.medianMs : undefined;
        return (
          <div className={"bar-row" + (!order && breaks[index] ? " gap-before" : "")} data-tech={row.tech} data-label={row.label} data-slices={JSON.stringify(Object.fromEntries(ACTIVE.map(([key]) => [key, row.span.slices[key] ?? 0])))} key={row.tech} {...tipRow}>
            <BarTip
              title={row.label}
              tech={row.tech}
              visual={<Donut row={row} />}
              lines={[
                ...SEGMENTS.flatMap(([key, color, label]) => {
                  const value = row.span.slices[key];
                  return value === null ? [] : [{ label, color, value: `${value.toFixed(1)} ms · ${pct(value, row.span.wallMs)}` }];
                }),
                { label: "active", value: `${activeMs(row).toFixed(1)} ms` },
                { label: "total incl. idle", value: `${row.span.wallMs.toFixed(1)} ms` },
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
              <span className="bar-unit"> ms</span>
            </span>
          </div>
        );
      })}
      <Axis {...sc} unit="ms" />
    </div>
      {legend ? <div className="attr-legend">
        {bars.map(([key, color, label]) => (
          <span key={key}><i style={{ background: color }} />{label}</span>
        ))}
      </div> : null}
    </>
  );
}
