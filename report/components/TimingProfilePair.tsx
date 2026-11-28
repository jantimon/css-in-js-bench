import React from "react";
import { defaultShown } from "../default-lanes.ts";
import { BarChart, type Bar } from "./BarChart.tsx";
import { InfoTip } from "./InfoTip.tsx";
import { activeMs, SEGMENTS, WpdBreakdownChart, type WpdBreakdownRow } from "./WpdBreakdownChart.tsx";

const ACTIVE = SEGMENTS.filter(([key]) => key !== "idle");

// A browser measure as one pair on shared rows: the repeated timing on the left (lane colours,
// sorted fastest first) and one Chrome profile of the same action on the right, split by kind of
// work; hovering a profile bar shows it as a DevTools-style donut. The caption below compares
// the busiest and the least busy visible lane in the profile (profDiff() in report.tsx redoes it
// when the tech filter changes).
export function TimingProfilePair({ bars, rows, wpdVersion, profileN, caseN }: { bars: Bar[]; rows: WpdBreakdownRow[]; wpdVersion: string; profileN: number; caseN: number }) {
  if (!bars.length) return rows.length ? <ProfileOnly rows={rows} wpdVersion={wpdVersion} /> : null;
  const order = [...bars].sort((a, b) => a.value - b.value).map((b) => b.tech);
  for (const r of rows) if (!order.includes(r.tech)) order.push(r.tech);
  const sorted = defaultShown([...rows]).sort((a, b) => activeMs(a) - activeMs(b));
  // A repeated action profiles several runs and keeps the occurrence nearest the median.
  const repeated = rows.some((r) => (r.timing?.samplesMs.length ?? 0) > 1);
  return (
    <div className="pair prof">
      <div className="pair-col">
        <div className="pair-head">Median duration, ms</div>
        <BarChart bars={bars} unit="ms" higherBetter={false} order={order} />
      </div>
      {rows.length ? (
        <div className="pair-col pair-r">
          <div className="pair-head">
            Breakdown, {repeated ? "median" : "one"} Chrome profile
            <InfoTip>
              Where the browser spends its time in this step: running JavaScript, recalculating styles, layout, painting and
              garbage collection.
              <span className="tip-p">
                Recorded with Chrome's profiler on a smaller page, {profileN} components instead of {caseN.toLocaleString()}, because
                profiling slows the page down a lot{repeated ? "; the median of several page loads is shown" : ""}. Use these bars to
                compare the libraries with each other, not with the times on the left.
              </span>
              <span className="tip-p">Time the browser sits idle is not counted. Hover a bar for the exact numbers.</span>
              <span className="tip-p tip-src">Tool: web-performance-debugger {wpdVersion}</span>
            </InfoTip>
          </div>
          <div className="attr-legend pair-legend">
            {ACTIVE.map(([key, color, label]) => <span key={key}><i style={{ background: color }} />{key === "js" ? "JS" : label}</span>)}
          </div>
          <WpdBreakdownChart rows={rows} order={order} legend={false} />
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

/** Same text as profDiff() in report.tsx's client script. */
function diffText(least: WpdBreakdownRow, most: WpdBreakdownRow): string {
  const total = activeMs(most) - activeMs(least);
  const parts = ACTIVE.map(([key, , label]) => [label, (most.span.slices[key] ?? 0) - (least.span.slices[key] ?? 0)] as const)
    .filter(([, d]) => Math.abs(d) >= 0.1)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([label, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} ms ${label}`);
  return `${most.label} keeps the browser busy ${total.toFixed(1)} ms longer than ${least.label}, the least busy${parts.length ? `: ${parts.join(", ")}` : ""}`;
}
