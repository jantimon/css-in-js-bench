import React from "react";
import { TechLabel } from "./TechLabel.tsx";

export interface SweepLine {
  tech: string;
  label: string;
  color: string;
  points: { n: number; ms: number }[];
}

// Render time vs instance count (the nsweep). One polyline per lane over evenly-spaced
// n ticks (the n's aren't linearly spaced, so index positions read better). Each line
// carries data-tech so the global filter hides it. y is linear ms.
export function LineChart({ lines }: { lines: SweepLine[] }) {
  const ns = lines[0]?.points.map((p) => p.n) ?? [];
  if (!ns.length) return null;
  const W = 720;
  const H = 280;
  const padL = 48;
  const padB = 30;
  const padT = 12;
  const padR = 12;
  const maxMs = Math.max(1e-6, ...lines.flatMap((l) => l.points.map((p) => p.ms)));
  const x = (i: number) => padL + (i / (ns.length - 1)) * (W - padL - padR);
  const y = (ms: number) => H - padB - (ms / maxMs) * (H - padT - padB);
  const yTicks = 4;
  // geometry the toggle controller needs to rescale the y-axis to the VISIBLE lines' max
  // (without JS, the SSR render below already fits the global max — all lanes shown).
  const geo = [W, H, padL, padR, padT, padB, ns.length, yTicks].join(",");
  return (
    <div className="lchart" data-geo={geo}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: yTicks + 1 }, (_, t) => {
          const ms = (maxMs / yTicks) * t;
          return (
            <g key={t} data-yt={t}>
              <line x1={padL} y1={y(ms)} x2={W - padR} y2={y(ms)} stroke="#21262d" />
              <text x={padL - 6} y={y(ms) + 3} textAnchor="end" className="lc-axis">
                {ms.toFixed(ms < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {ns.map((n, i) => (
          <text key={n} x={x(i)} y={H - padB + 16} textAnchor="middle" className="lc-axis">
            {n.toLocaleString()}
          </text>
        ))}
        {lines.map((l) => (
          <polyline
            key={l.tech}
            data-tech={l.tech}
            data-ms={l.points.map((p) => p.ms).join(",")}
            className="lc-line"
            points={l.points.map((p, i) => `${x(i)},${y(p.ms)}`).join(" ")}
            stroke={l.color}
            fill="none"
          />
        ))}
        {lines.map((l) =>
          l.points.map((p, i) => <circle key={l.tech + i} data-tech={l.tech} data-ms={p.ms} className="lc-dot" cx={x(i)} cy={y(p.ms)} r={2.5} fill={l.color} />),
        )}
      </svg>
      <div className="lc-legend">
        {lines.map((l) => (
          <span data-tech={l.tech} key={l.tech}>
            <i style={{ background: l.color }} />
            <TechLabel tech={l.tech} label={l.label} />
          </span>
        ))}
      </div>
    </div>
  );
}
