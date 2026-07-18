// Agent-readable markdown companion to BENCHMARK.html. Same data, but every chart is a
// plain data table, the code editor is replaced by links to the verbatim source files, and
// only a curated set of techs is shown (MD_TECHS). Every measurement is DEFINED ONCE up top
// (the html's per-chart (i) tooltips, flattened to prose) so the per-case tables stay terse.
// Kept as a report module (not a third script) — it reads only the already-reduced section
// data report.tsx computed, never result/ or the tech sources directly.
import type { Bar } from "./components/BarChart.tsx";
import type { AttrRow } from "./components/AttributionChart.tsx";
import type { StackRow } from "./components/StackChart.tsx";
import type { SweepLine } from "./components/LineChart.tsx";
import type { RenderTimingRow } from "./components/RenderTimingChart.tsx";
import type { CaseMeta, RunMeta, TechInfo } from "./types.ts";

// The curated lanes, in report order. Dir names (data keys); labels come from package.json.
const MD_TECHS = ["next-yak", "next-yak-css", "stylex", "cnfast", "styled-components"] as const;

export interface MdSection {
  caseId: string;
  cm: CaseMeta;
  bars: Bar[];
  payRows: StackRow[];
  acanBars: Bar[];
  attrRows: AttrRow[];
  hydBars: Bar[];
  hydAttrRows: AttrRow[];
  inpBars: Bar[];
  inpAttrRows: AttrRow[];
  mountBars: Bar[];
  mountAttrRows: AttrRow[];
  sweepLines: SweepLine[];
  rtRows: RenderTimingRow[];
}

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const ms = (n: number) => n.toFixed(2);
const bytes = (n: number) => n.toLocaleString("en-US");

// Keep only the curated lanes, in MD_TECHS order. `getTech` reads the row's data key.
const pick = <T>(rows: T[], getTech: (r: T) => string): T[] => {
  const by = new Map(rows.map((r) => [getTech(r), r]));
  return MD_TECHS.map((t) => by.get(t)).filter((r): r is T => r !== undefined);
};

const table = (header: string[], rows: string[][]): string => {
  const head = `| ${header.join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
};

// A plain value bar (throughput, ms, req/s). Best-first; the winning value is **bolded**.
const barTable = (rows: Bar[], unit: string, higherBetter: boolean): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => (higherBetter ? b.value - a.value : a.value - b.value));
  if (!picked.length) return "";
  return table(
    ["Technique", unit],
    picked.map((r, i) => [r.label, (i === 0 ? "**" : "") + int(r.value) + (i === 0 ? "**" : "")]),
  );
};

// CPU self-time split (render / hydration / interaction / cold-mount). Lower total is better.
const attrTable = (rows: AttrRow[], otherLabel: string): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => a.renderMs - b.renderMs);
  if (!picked.length) return "";
  return table(
    ["Technique", "total ms", "react-dom", "styling lib", "component", otherLabel],
    picked.map((r, i) => [r.label, (i === 0 ? "**" : "") + ms(r.renderMs) + (i === 0 ? "**" : ""), ms(r.react), ms(r.lib), ms(r.component), ms(r.other)]),
  );
};

const payloadTable = (rows: StackRow[]): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => a.total - b.total);
  if (!picked.length) return "";
  return table(
    ["Technique", "total (gz B)", "JS", "CSS", "HTML"],
    picked.map((r, i) => {
      const [js, css, html] = r.values;
      return [r.label, (i === 0 ? "**" : "") + bytes(r.total) + (i === 0 ? "**" : ""), bytes(js), bytes(css), bytes(html)];
    }),
  );
};

// Browser render-work on a cold mount (from wpd), best-first by Chrome style-recalc count.
// Chrome's authoritative axis is counts; Firefox's is Gecko ms — cells are "—" when an engine
// doesn't report that field (Firefox has no paint / per-element counts).
const rtTable = (rows: RenderTimingRow[]): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => (a.chrome?.styleCount ?? Infinity) - (b.chrome?.styleCount ?? Infinity));
  if (!picked.length) return "";
  const cell = (v: number | null | undefined, f: (n: number) => string) => (typeof v === "number" ? f(v) : "—");
  return table(
    ["Technique", "Chrome recalcs", "Chrome layout ms", "Chrome paint ms", "Firefox style ms", "Firefox forced ms"],
    picked.map((r, i) => [
      r.label,
      (i === 0 ? "**" : "") + cell(r.chrome?.styleCount, int) + (i === 0 ? "**" : ""),
      cell(r.chrome?.layoutMs, ms),
      cell(r.chrome?.paintMs, ms),
      cell(r.firefox?.styleMs, ms),
      cell(r.firefox?.forcedLayoutMs, ms),
    ]),
  );
};

// Render time (ms) at each instance count — one column per n, one row per lane.
const sweepTable = (lines: SweepLine[]): string => {
  const picked = pick(lines, (l) => l.tech);
  if (!picked.length) return "";
  const ns = picked[0].points.map((p) => p.n);
  return table(
    ["Technique", ...ns.map((n) => `n=${n.toLocaleString("en-US")}`)],
    picked.map((l) => [l.label, ...l.points.map((p) => ms(p.ms))]),
  );
};

const MEASUREMENTS = `## Measurements

Every per-case section below reports these as tables. Definitions are given here once. The
statistic is the **median** of repeated runs; production React in every lane. In each table the
best value is **bold** and rows are sorted best-first.

- **SSR render throughput** — renders/sec, higher is better. How many times per second the lane
  renders the whole workload to an HTML string in Node (\`renderToString\`), timing the production
  render only — build-time CSS collection (a Tailwind JIT, a Panda sheet slice) is excluded.
- **SSR throughput under load** — requests/sec, higher is better. Requests/sec sustained under
  concurrent HTTP load (autocannon) serving the SSR render end-to-end. Includes serializing and
  writing the full response every request, so a larger HTML/CSS payload costs here even when the
  render itself is fast (this is why a lane can win render throughput yet lose under load).
- **Where the SSR render time goes** — CPU self-time, ms/render, lower is better. The median
  server \`renderToString()\` split by CPU self-time from a sampled V8 profile mapped through
  source maps: **react-dom** (the floor every lane shares), the **styling library** runtime, and
  **your component**. *other* is GC / unattributed native work.
- **Where the client hydration time goes** — CPU self-time, ms, lower is better. Time for React to
  **hydrate** the server HTML in the browser — attach handlers and build the fiber tree over the
  existing DOM (no markup re-creation) — as a single hydration commit, split the same way. *other*
  is browser-native / GC.
- **Where the interaction time goes** — in-place re-render, ms, lower is better. A state change
  triggers a synchronous re-render (\`flushSync\`) of the whole mounted workload, then waits for the
  next paint — click→paint latency, split by package. This is where **runtime** CSS-in-JS re-runs
  its per-element styling on every update; build-time lanes do almost none.
- **Where the cold-mount time goes** — blank screen → first render, ms, lower is better. From a
  **blank root** (no SSR markup) a "click" renders the whole workload from scratch
  (\`createRoot().render()\`), then waits for first paint. Unlike hydration this cold mount's first
  paint includes each **runtime** library's **first style injection** into the document.
- **Browser render-work on cold mount** — style-recalc / layout / paint, lower is better. The
  browser engine's OWN rendering work (not JS), on a cold mount, measured by \`wpd\` in Chrome and
  Firefox. Runtime CSS-in-JS injects a style rule per instance, so the engine recalculates styles
  ~once per instance — **Chrome**'s authoritative signal is that **style-recalc count** (n instances
  → ~n recalcs vs 1 for extracted CSS). **Firefox** (Gecko) reports style / forced-layout **ms**, no
  paint or per-element counts. Opt-in (\`pnpm setup:wpd\`); a "—" means that engine doesn't report it.
- **Page bytes shipped** — JS + CSS + HTML, gzipped, lower is better. Gzipped bytes the browser
  downloads: the client JS runtime the lane ships over the bare-React floor, the CSS, and the SSR
  HTML.
- **Scaling** — SSR render time (ms) vs instance count. Render time as the workload grows from a
  handful to thousands of instances; a flatter progression scales better.

**Attribution caveat:** next-yak's SWC plugin *inlines* its css-prop resolution into your
component, so next-yak's own styling-runtime cost is bucketed under **component** / *other* rather
than **styling lib** (which reads ~0 for it). StyleX and styled-components keep their runtime in
\`node_modules\`, so theirs shows under **styling lib**. Don't read next-yak's ~0 "styling lib" as
"no runtime cost" — it moved buckets.`;

/** Build the full agent-readable markdown report. */
export function renderMarkdown(sections: MdSection[], techs: Record<string, TechInfo>, meta: RunMeta | null): string {
  const shownLabels = MD_TECHS.filter((t) => techs[t]).map((t) => `**${techs[t].label}** (\`${t}\`)`);
  const out: string[] = [
    `# Styling benchmarks`,
    ``,
    `One set of React components, built several different ways and measured head-to-head on identical workloads — so the numbers compare by construction, not by claim. This is the agent-readable companion to \`BENCHMARK.html\`; every chart here is a data table.`,
    ``,
    `**Techniques shown (${shownLabels.length}):** ${shownLabels.join(" · ")}. Other lanes in the HTML report are omitted here.`,
    meta ? `\n_Run: ${meta.node} · ${meta.host} · ${meta.timestamp}${meta.gitSha ? ` · ${meta.gitSha}` : ""}_` : ``,
    ``,
    MEASUREMENTS,
  ];

  for (const s of sections) {
    const covered = new Set(MD_TECHS.filter((t) => s.bars.some((b) => b.tech === t) || s.attrRows.some((r) => r.tech === t)));
    const missing = MD_TECHS.filter((t) => techs[t] && !covered.has(t));
    const links = MD_TECHS.filter((t) => techs[t] && covered.has(t)).map((t) => `[${techs[t].label}](techs/${t}/case/${s.caseId}/index.tsx)`);

    out.push(``, `## ${s.cm.label}`, ``, s.cm.description, ``);
    out.push(`- **n:** ${s.cm.n.toLocaleString("en-US")} · **cardinality:** ${s.cm.cardinality}`);
    if (links.length) out.push(`- **Source:** ${links.join(" · ")}`);
    if (missing.length) out.push(`- **Not covered by this case:** ${missing.map((t) => techs[t].label).join(", ")}`);

    const blocks: [string, string][] = [
      ["### SSR render throughput — renders/sec, higher is better", barTable(s.bars, "renders/sec", true)],
      ["### SSR throughput under load — requests/sec, higher is better", barTable(s.acanBars, "requests/sec", true)],
      ["### Where the SSR render time goes — ms/render, lower is better", attrTable(s.attrRows, "other")],
      [
        "### Where the client hydration time goes — ms, lower is better",
        s.hydAttrRows.length ? attrTable(s.hydAttrRows, "browser/gc") : barTable(s.hydBars, "ms", false),
      ],
      [
        "### Where the interaction time goes — in-place re-render, ms, lower is better",
        s.inpAttrRows.length ? attrTable(s.inpAttrRows, "browser/gc") : barTable(s.inpBars, "ms", false),
      ],
      [
        "### Where the cold-mount time goes — ms, lower is better",
        s.mountAttrRows.length ? attrTable(s.mountAttrRows, "browser/gc") : barTable(s.mountBars, "ms", false),
      ],
      ["### Browser render-work on cold mount — Chrome counts + Firefox ms, lower is better", rtTable(s.rtRows)],
      ["### Page bytes shipped — gzipped, lower is better", payloadTable(s.payRows)],
      ["### Scaling — SSR render time (ms) vs instance count", sweepTable(s.sweepLines)],
    ];
    for (const [heading, tbl] of blocks) if (tbl) out.push(``, heading, ``, tbl);
  }

  return out.join("\n") + "\n";
}
