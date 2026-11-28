import React from "react";
import { InfoTip } from "./InfoTip.tsx";
import { TechLabel } from "./TechLabel.tsx";
import { activeMs, SEGMENTS, WpdBreakdownChart, type WpdBreakdownRow } from "./WpdBreakdownChart.tsx";

const ACTIVE = SEGMENTS.filter(([key]) => key !== "idle");
const R = 38;
const STROKE = 16;
const C = 2 * Math.PI * R;
/** Up to this many visible lanes the profile shows as donut cards, above it as stacked bars. */
export const FEW_LANES = 3;

// "Where the time goes": one Chrome profile per lane, shown below the repeated-timing chart.
// It renders both views; `.prof-few` (set here for the full lane set and again by
// rescaleBars() in report.tsx when the tech filter changes) picks donut cards for a few
// visible lanes and stacked bars for more. The caption names where the lane with the most
// active time spends it, compared with the lane with the least.
export function ProfileSection({ rows, wpdVersion }: { rows: WpdBreakdownRow[]; wpdVersion: string }) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => activeMs(a) - activeMs(b));
  return (
    <div className={"prof" + (sorted.length <= FEW_LANES ? " prof-few" : "")}>
      <h4 className="prof-title">
        <span className="ct-main">Where the time goes</span> <span className="ct-sub">(one Chrome profile · ms active · lower is better)</span>
        <InfoTip>
          A separate measurement from the chart above: one Chrome profile per lane (web-performance-debugger {wpdVersion}).
          Each lane is one named action, including the next frame. Lanes rank by active time, the span minus idle frame wait.
          Repeated actions use the occurrence with the lower median profile duration. The profiled median includes profiler
          overhead.
        </InfoTip>
      </h4>
      <p className="prof-diff" data-screen-only>{sorted.length > 1 ? diffText(sorted[0], sorted[sorted.length - 1]) : ""}</p>
      <div className="pd" data-screen-only>
        {sorted.map((row) => (
          <div className="pd-card" data-tech={row.tech} data-label={row.label} data-slices={JSON.stringify(Object.fromEntries(ACTIVE.map(([key, , label]) => [label, row.span.slices[key] ?? 0])))} key={row.tech}>
            <div className="pd-head"><TechLabel tech={row.tech} label={row.label} /></div>
            <div className="pd-body">
              <Donut row={row} />
              <span className="pd-legend">
                {ACTIVE.map(([key, color, label]) => {
                  const ms = row.span.slices[key];
                  return ms === null ? null : (
                    <React.Fragment key={key}>
                      <span className={"pd-ms" + (ms === 0 ? " pd-zero" : "")}>{ms.toFixed(1)} ms</span>
                      <span className={"pd-key" + (ms === 0 ? " pd-zero" : "")}><i style={{ background: color }} />{label}</span>
                    </React.Fragment>
                  );
                })}
                <span className="pd-ms pd-total">{activeMs(row).toFixed(1)} ms</span>
                <span className="pd-key pd-total">active</span>
                <span className="pd-ms pd-zero">+{row.span.slices.idle.toFixed(1)} ms</span>
                <span className="pd-key pd-zero">idle / frame wait</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <WpdBreakdownChart rows={rows} />
    </div>
  );
}

/** Same text as profDiff() in report.tsx's client script. */
function diffText(least: WpdBreakdownRow, most: WpdBreakdownRow): string {
  const total = activeMs(most) - activeMs(least);
  const parts = ACTIVE.map(([key, , label]) => [label, (most.span.slices[key] ?? 0) - (least.span.slices[key] ?? 0)] as const)
    .filter(([, d]) => Math.abs(d) >= 0.1)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([label, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} ${label}`);
  return `${most.label} spends ${total.toFixed(1)} ms more active time than ${least.label}${parts.length ? `: ${parts.join(", ")}` : ""}.`;
}

function Donut({ row }: { row: WpdBreakdownRow }) {
  const total = activeMs(row);
  let offset = 0;
  return (
    <svg className="pd-donut" viewBox="0 0 100 100" width={100} height={100} role="img" aria-label={`${total.toFixed(1)} ms active`}>
      <g transform="rotate(-90 50 50)">
        {ACTIVE.map(([key, color]) => {
          const ms = row.span.slices[key];
          if (!ms || total <= 0) return null;
          const len = (ms / total) * C;
          const arc = <circle key={key} cx={50} cy={50} r={R} fill="none" stroke={color} strokeWidth={STROKE} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return arc;
        })}
      </g>
      <text x={50} y={54} textAnchor="middle" className="pd-center">{total.toFixed(1)} ms</text>
    </svg>
  );
}
