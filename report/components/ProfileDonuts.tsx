import React from "react";
import { BarChart, type Bar } from "./BarChart.tsx";
import { InfoTip } from "./InfoTip.tsx";
import { TechLabel } from "./TechLabel.tsx";
import { activeMs, SEGMENTS, WpdBreakdownChart, type WpdBreakdownRow } from "./WpdBreakdownChart.tsx";

const ACTIVE = SEGMENTS.filter(([key]) => key !== "idle");
const R = 38;
const STROKE = 16;
const C = 2 * Math.PI * R;
/** Up to this many visible lanes the profile shows as donut cards, above it as stacked bars. */
export const FEW_LANES = 3;

// A browser measure as one pair on shared rows: the repeated timing on the left (lane colours,
// sorted fastest first) and one Chrome profile of the same action on the right, split by kind of
// work. The profile column shows stacked bars, or one donut card per lane when only a few lanes
// are visible (`.prof-few`, set here for the full lane set and again by rescaleBars() in
// report.tsx when the tech filter changes). The caption below compares the busiest and the least
// busy visible lane in the profile.
export function TimingProfilePair({ bars, rows, wpdVersion }: { bars: Bar[]; rows: WpdBreakdownRow[]; wpdVersion: string }) {
  if (!bars.length) return rows.length ? <ProfileOnly rows={rows} wpdVersion={wpdVersion} /> : null;
  const order = [...bars].sort((a, b) => a.value - b.value).map((b) => b.tech);
  for (const r of rows) if (!order.includes(r.tech)) order.push(r.tech);
  const sorted = [...rows].sort((a, b) => activeMs(a) - activeMs(b));
  return (
    <div className={"pair prof" + (order.length <= FEW_LANES ? " prof-few" : "")}>
      <div className="pair-col">
        <div className="pair-head">Total</div>
        <BarChart bars={bars} unit="ms" higherBetter={false} order={order} />
      </div>
      {rows.length ? (
        <div className="pair-col pair-r">
          <div className="pair-head">
            Active time, one Chrome profile
            <InfoTip>
              A separate measurement from the total: one Chrome profile per lane (web-performance-debugger {wpdVersion}).
              Active time is the profiled span minus the time spent waiting for the next frame. Hover a bar for the idle
              time and the full span.
            </InfoTip>
          </div>
          <div className="attr-legend pair-legend">
            {ACTIVE.map(([key, color, label]) => <span key={key}><i style={{ background: color }} />{key === "other" ? "other" : label}</span>)}
          </div>
          <WpdBreakdownChart rows={rows} order={order} legend={false} />
          <Cards sorted={sorted} />
        </div>
      ) : null}
      {rows.length > 1 ? <p className="prof-diff" data-screen-only>{diffText(sorted[0], sorted[sorted.length - 1])}</p> : null}
    </div>
  );
}

function ProfileOnly({ rows, wpdVersion }: { rows: WpdBreakdownRow[]; wpdVersion: string }) {
  return (
    <div className="prof">
      <p className="ch-cap">Active milliseconds in one Chrome profile (web-performance-debugger {wpdVersion}).</p>
      <WpdBreakdownChart rows={rows} />
    </div>
  );
}

function Cards({ sorted }: { sorted: WpdBreakdownRow[] }) {
  return (
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
  );
}

/** Same text as profDiff() in report.tsx's client script. */
function diffText(least: WpdBreakdownRow, most: WpdBreakdownRow): string {
  const total = activeMs(most) - activeMs(least);
  const parts = ACTIVE.map(([key, , label]) => [label, (most.span.slices[key] ?? 0) - (least.span.slices[key] ?? 0)] as const)
    .filter(([, d]) => Math.abs(d) >= 0.1)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([label, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} ms ${label}`);
  return `In this profile ${most.label} is busy ${total.toFixed(1)} ms longer than ${least.label}${parts.length ? `: ${parts.join(", ")}` : ""}.`;
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
