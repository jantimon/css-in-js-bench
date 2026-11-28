import React from "react";

/**
 * The value scale under a bar chart: the smallest 1 / 2 / 2.5 / 5 × 10ⁿ step that covers `max`
 * in at most `maxIntervals` steps, and a top that ends on a tick. Bars are drawn against `top`,
 * so the longest bar may stop a little before the end of its track.
 * report.tsx's client script embeds this function (via toString) to redo the scale when the
 * tech filter changes, so it must stay plain JavaScript without outside references.
 */
export function niceScale(max: number, maxIntervals = 5): { top: number; ticks: number[] } {
  const m = max > 0 ? max : 1;
  const pow = 10 ** Math.floor(Math.log10(m / maxIntervals));
  let step = 10 * pow;
  for (const k of [1, 2, 2.5, 5, 10]) {
    if (Math.ceil(m / (k * pow) - 1e-9) <= maxIntervals) {
      step = k * pow;
      break;
    }
  }
  const top = Math.ceil(m / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step * 1e-6; t += step) ticks.push(+t.toFixed(6));
  return { top, ticks };
}

/** Tick label: up to two decimals; thousands as "k". Embedded in the client script like niceScale. */
export function tickText(n: number): string {
  return n >= 1000 ? String(+(n / 1000).toFixed(1)) + "k" : String(+n.toFixed(2));
}

/**
 * Faint gridlines at each tick plus a ruler under the last row with a short tick and label per
 * value; the unit follows the last label. `div` converts data units to label units (bytes → kB).
 * Rendered inside a `.bars` / `.attr` grid; rescaleBars() in report.tsx rebuilds it when the
 * tech filter changes the visible maximum.
 */
export function Axis({ top, ticks, unit, div = 1 }: { top: number; ticks: number[]; unit: string; div?: number }) {
  return (
    <div className="axis" data-unit={unit} data-div={div} aria-hidden="true">
      {ticks.map((t, i) => (
        <i key={t} style={{ "--p": (t / top).toFixed(5) } as React.CSSProperties}>
          <b>
            {tickText(t / div)}
            {i === ticks.length - 1 ? <u>{unit}</u> : null}
          </b>
        </i>
      ))}
    </div>
  );
}

/** Scale for data in `div`-sized units, returned in data units. */
export function scaleFor(max: number, div = 1): { top: number; ticks: number[] } {
  const s = niceScale(max / div);
  return { top: s.top * div, ticks: s.ticks.map((t) => t * div) };
}
