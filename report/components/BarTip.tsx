import React from "react";

export interface TipLine {
  label: string;
  value: string;
  /** swatch colour, for a segment of a stacked bar */
  color?: string;
}

/** Where a row stands in its chart. Rows arrive sorted best-first. */
export interface TipRank {
  /** the value the chart sorts by */
  value: number;
  unit: string;
  higherBetter: boolean;
  /** 0-based position among all rows */
  index: number;
  rows: { value: number; label: string }[];
}

// The hover card for one bar row. CSS only (see `.bar-tip` in report.tsx): the hovered row's
// track becomes the anchor and the card sits above it with CSS anchor positioning. Browsers
// without anchor positioning show no card; the row's visible numbers stay the same. On touch
// screens a tap focuses the row (tabIndex -1 keeps it out of the tab order) and shows the card.
// The rank line and the note are rewritten by rescaleBars() in report.tsx to count only the
// lanes the tech filter shows; the server text counts every lane.
export function BarTip({ title, lines, rank, note }: { title: string; lines: TipLine[]; rank?: TipRank; note?: string }) {
  const best = rank?.rows[0];
  return (
    <span className="bar-tip" role="tooltip" data-screen-only>
      <span className="bt-title">{title}</span>
      {lines.map((l) => (
        <React.Fragment key={l.label}>
          <span className="bt-key">
            {l.color ? <i style={{ background: l.color }} /> : null}
            {l.label}
          </span>
          <span className="bt-val">{l.value}</span>
        </React.Fragment>
      ))}
      {rank && best ? (
        <>
          <span className="bt-key">rank</span>
          <span className="bt-val" data-bt-rank>
            {rank.index + 1} of {rank.rows.length}
          </span>
          <span className="bt-note" data-bt-vs={rank.value} data-unit={rank.unit} data-hb={rank.higherBetter ? "1" : "0"}>
            {vsBest(rank.value, best.value, best.label, rank.unit, rank.higherBetter)}
          </span>
        </>
      ) : note ? (
        <span className="bt-note">{note}</span>
      ) : null}
    </span>
  );
}

/** Props for a row that carries a BarTip. */
export const tipRow = { tabIndex: -1 } as const;

/** "2.30× more ms than vanilla". Mirrored in rescaleBars() in report.tsx. */
export function vsBest(value: number, best: number, bestLabel: string, unit: string, higherBetter: boolean): string {
  if (value === best) return "best in this chart";
  const ratio = higherBetter ? best / value : value / best;
  return `${ratio.toFixed(ratio < 10 ? 2 : 1)}× ${higherBetter ? "fewer" : "more"} ${unit} than ${bestLabel}`;
}

/** share of a total, as "42%" */
export const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "–");
