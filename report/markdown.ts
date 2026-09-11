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
import type { WpdBreakdownRow } from "./components/WpdBreakdownChart.tsx";
import type { BuildTimeRow } from "./components/BuildTimeChart.tsx";
import type { CaseMeta, RunMeta, TechInfo } from "./types.ts";
import { httpMeasurementNote, type HttpProtocol } from "./http-results.ts";
import { MEASUREMENT_TITLES, type CaseAnalysis, type MeasurementKey, type StudyAnalysis } from "./analysis-schema.ts";

// The curated lanes, in report order. Dir names (data keys); labels come from package.json.
const MD_TECHS = ["next-yak", "next-yak-css", "stylex-layers", "bamboo", "cnfast", "styled-components"] as const;

export interface MdSection {
  caseId: string;
  cm: CaseMeta;
  bars: Bar[];
  payRows: StackRow[];
  acanBars: Bar[];
  attrRows: AttrRow[];
  hydBars: Bar[];
  hydWpdRows: WpdBreakdownRow[];
  inpBars: Bar[];
  inpWpdRows: WpdBreakdownRow[];
  mountBars: Bar[];
  mountWpdRows: WpdBreakdownRow[];
  sweepLines: SweepLine[];
  rtRows: RenderTimingRow[];
  analysis: CaseAnalysis | null;
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
// Rows carrying the per-element normalization get it as an extra column.
const barTable = (rows: Bar[], unit: string, higherBetter: boolean): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => (higherBetter ? b.value - a.value : a.value - b.value));
  if (!picked.length) return "";
  const withNorm = picked.some((r) => r.msPer1kElems !== undefined);
  return table(
    ["Technique", unit, ...(withNorm ? ["ms / 1k elements"] : [])],
    picked.map((r, i) => [
      r.label,
      (i === 0 ? "**" : "") + int(r.value) + (i === 0 ? "**" : ""),
      ...(withNorm ? [r.msPer1kElems !== undefined ? ms(r.msPer1kElems) : "—"] : []),
    ]),
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

// A table cell for a number an engine may not report: "—" when the field is absent.
const cell = (v: number | null | undefined, f: (n: number) => string) => (typeof v === "number" ? f(v) : "—");

// Browser render-work on a cold mount (from wpd), best-first by Chrome style-recalc count.
// Chrome's authoritative axis is counts; Firefox's is Gecko ms — cells are "—" when an engine
// doesn't report that field (Firefox has no paint / per-element counts).
const rtTable = (rows: RenderTimingRow[]): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => (a.chrome?.styleCount ?? Infinity) - (b.chrome?.styleCount ?? Infinity));
  if (!picked.length) return "";
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

const wpdTable = (rows: WpdBreakdownRow[]): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => (a.span.wallMs - a.span.slices.idle) - (b.span.wallMs - b.span.slices.idle));
  if (!picked.length) return "";
  return table(
    ["Technique", "active ms", "span ms", "profiled timing median", "samples", "JS", "style", "layout", "paint", "idle"],
    picked.map((r, i) => {
      const active = r.span.wallMs - r.span.slices.idle;
      return [r.label, (i === 0 ? "**" : "") + ms(active) + (i === 0 ? "**" : ""), ms(r.span.wallMs), r.medianMs === undefined ? "—" : ms(r.medianMs), r.timing ? String(r.timing.samplesMs.length) : "—", ms(r.span.slices.js), cell(r.span.slices.style, ms), cell(r.span.slices.layout, ms), cell(r.span.slices.paint, ms), ms(r.span.slices.idle)];
    }),
  );
};

// Build time (ms) per LANE — cold client build (bar headline), warm build, and the lane's
// cssKind as context. Fastest cold build first; the winner is **bold**.
const buildtimeTable = (rows: BuildTimeRow[]): string => {
  const picked = pick(rows, (r) => r.tech).sort((a, b) => a.coldMs - b.coldMs);
  if (!picked.length) return "";
  return table(
    ["Technique", "CSS", "cold build (ms)", "warm build (ms)"],
    picked.map((r, i) => [
      r.label,
      r.cssKind,
      (i === 0 ? "**" : "") + int(r.coldMs) + (i === 0 ? "**" : ""),
      r.warmMs === undefined ? "—" : int(r.warmMs),
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

Every per-case section reports these as tables; they are defined here once. Where a timing repeats,
the statistic is the **median**. The Chrome-profiled span anatomy (recorded with
web-performance-debugger WPD_VERSION) is one recorded action, so it carries profiler overhead and
frame waits that the plain timing charts do not — read the two side by side, not against each other.
Every lane uses its framework's production build. In each table the best value is **bold** and rows
sort best-first.

- **SSR render throughput** — renders/sec, higher is better. Uses a microbenchmark to measure how
  fast Node turns components into an HTML string after warmup. Measures rendering only, excluding
  build time, HTTP handling, response transfer and browser work. Results count component instances
  per second: a workload of 400 product tiles counts as 400 renders.
- **SSR throughput under load** — requests/sec, higher is better. Uses autocannon to measure
  end-to-end HTTP throughput on this machine: sending a request, rendering the whole workload into
  an HTML fragment, and transferring and receiving the response. Clients keep concurrent connections
  open. Each request renders the full workload, so a workload of 400 product tiles counts as one
  request. Excludes build time, browser rendering and external network latency. HTTP_METHOD
- **Where the SSR render time goes** — CPU self-time, ms/render, lower is better. One server render
  split into **UI framework** work (React or Solid), **styling library** runtime, and **your components**.
  Framework work can differ when a lane removes component calls. *other* is garbage
  collection and native work.
- **Where the client hydration time goes** — ms, lower is better. The browser gets finished HTML and
  the framework attaches handlers and state without rebuilding the markup. Repeated timing starts on a
  ready page and ends at DOM commit: React useLayoutEffect or Solid flush, before paint. The separate
  profiled span includes the next frame and splits JS, style, layout, paint, GC, browser work and idle.
- **Where the interaction time goes** — ms, lower is better. Each instance's value changes from \`i\`
  to \`i + 1\`, so every element really updates; React sets state, Solid sets a signal. Both warm up
  first and the reset sits outside the timer. This is not INP: the timing stops at the first animation
  frame, and the profiled span adds one frame to catch rendering work. Cross-framework ratios describe
  the whole workload. Use vanilla lanes as references; compilers and styled runtimes can also remove component work.
- **Where the cold-mount time goes** — ms, lower is better. The workload renders into an empty root
  on a ready page. Repeated timing ends at DOM commit, before paint; page load and network work stay
  outside the timer. The separate profiled span includes the next frame's rendering work.
- **Browser render-work on cold mount** — style-recalc / layout / paint, lower is better. The browser
  engine's own work rather than JS. A library that writes CSS at runtime adds a style rule per
  instance, so the engine recalculates styles once per instance instead of once for the page —
  **Chrome**'s honest signal is that recalc count. **Firefox** reports sampled **ms** instead, where a
  zero can mean "not sampled" rather than "no work". Compare within one engine.
- **Page bytes shipped** — JS + CSS + HTML, gzipped, lower is better. What the browser downloads: the
  JavaScript this lane adds on top of a bare framework page, its CSS, and the server HTML. Solid marks
  every element with a hydration key and React needs none, so read the HTML column across frameworks
  with that in mind.
- **Scaling** — SSR render time (ms) vs instance count. A flatter progression means the cost per
  element stays put as the page grows.
- **Build time** — full client build (ms), lower is better. *cold* clears the lane's build output and
  caches first, so it pays for regenerating them; *warm* runs the same build again with nothing
  cleared. Median of 3, per lane — one build compiles every workload, so this is not per-case. This is
  developer experience and it depends on the machine; it says nothing about what users get.

**Attribution caveat:** next-yak's compiler inlines its css-prop resolution, so that styling work runs
from next-yak's own runtime rather than a call into a package. wpd bills it to the **styling lib**
bucket, never to **component**.`;

/** Build the full agent-readable markdown report. */
export function renderMarkdown(sections: MdSection[], techs: Record<string, TechInfo>, meta: RunMeta | null, wpdVersion: string, study: StudyAnalysis | null = null, buildtime: BuildTimeRow[] = [], httpProtocol: HttpProtocol | null = null): string {
  const shownLabels = MD_TECHS.filter((t) => techs[t]).map((t) => `**${techs[t].label}** (\`${t}\`)`);
  const out: string[] = [
    `# Styling benchmarks`,
    ``,
    `One set of React components, built several different ways and measured head-to-head on identical workloads — so the numbers compare by construction, not by claim. This is the agent-readable companion to \`BENCHMARK.html\`; every chart here is a data table.`,
    ``,
    `**Techniques shown (${shownLabels.length}):** ${shownLabels.join(" · ")}. Other lanes in the HTML report are omitted here.`,
    meta ? `\n_Run: ${meta.node} · ${meta.host} · ${meta.timestamp}${meta.gitSha ? ` · ${meta.gitSha}` : ""}_` : ``,
    ``,
    ...Object.entries(meta?.runtimePackages ?? {}).map(([name, pkg]) =>
      `Measured ${name} source revision: \`${pkg.revision}\`. Package SHA-256: \`${pkg.sha256}\`.`,
    ),
    ``,
    MEASUREMENTS,
  ];

  if (study) {
    // Analysis prose carries backtick-escaped tokens: case ids (`compose-3`), function and API
    // names (`Yak`, `styled()`). In the HTML report a case id is turned into a deep link to its
    // section anchor; here we deliberately leave every backtick as plain markdown code. Markdown
    // anchors are heading-slug based and brittle, so linking `compose-3` to a fabricated
    // `#composition--3-levels…` slug would rot the moment a title changed — code style is honest.
    out.push(``, `## Key findings`, ``, `> ${study.headline}`);
    for (const f of study.findings) out.push(``, `**${f.title}** — ${f.prose}`);
    if (study.libraryHints.length) {
      out.push(``, `### One hint per library`, ``);
      for (const h of study.libraryHints) out.push(`- **${techs[h.tech]?.label ?? h.tech}** — ${h.hint}`);
    }
  }

  for (const s of sections) {
    const covered = new Set(MD_TECHS.filter((t) => s.bars.some((b) => b.tech === t) || s.attrRows.some((r) => r.tech === t)));
    const missing = MD_TECHS.filter((t) => techs[t] && !covered.has(t));
    const links = MD_TECHS.filter((t) => techs[t] && covered.has(t)).map((t) => `[${techs[t].label}](techs/${t}/case/${s.caseId}/index.tsx)`);

    out.push(``, `## ${s.cm.label}`, ``, s.cm.description, ``);
    out.push(`- **n:** ${s.cm.n.toLocaleString("en-US")} · **cardinality:** ${s.cm.cardinality}`);
    if (links.length) out.push(`- **Source:** ${links.join(" · ")}`);
    if (missing.length) out.push(`- **Not covered by this case:** ${missing.map((t) => techs[t].label).join(", ")}`);

    if (s.analysis) {
      out.push(``, `### Analysis`, ``, `> ${s.analysis.headline}`);
      for (const k of Object.keys(MEASUREMENT_TITLES) as MeasurementKey[]) {
        const m = s.analysis.measurements[k];
        if (m) out.push(``, `- **${MEASUREMENT_TITLES[k]}** — winner: ${techs[m.winner]?.label ?? m.winner}. ${m.why}`);
      }
      if (s.analysis.crossCase) out.push(``, s.analysis.crossCase);
    }

    const blocks: [string, string][] = [
      ["### SSR render throughput — renders/sec, higher is better", barTable(s.bars, "renders/sec", true)],
      ["### SSR throughput under load — requests/sec, higher is better", barTable(s.acanBars, "requests/sec", true)],
      ["### Where the SSR render time goes — ms/render, lower is better", attrTable(s.attrRows, "other")],
      [
        "### Client hydration — profiled active work, lower is better",
        wpdTable(s.hydWpdRows),
      ],
      [
        "### Interaction update — profiled active work, lower is better",
        wpdTable(s.inpWpdRows),
      ],
      [
        "### Cold mount — profiled active work, lower is better",
        wpdTable(s.mountWpdRows),
      ],
      ["### Browser render-work on cold mount — Chrome counts + Firefox ms, lower is better", rtTable(s.rtRows)],
      ["### Page bytes shipped — gzipped, lower is better", payloadTable(s.payRows)],
      ["### Scaling — SSR render time (ms) vs instance count", sweepTable(s.sweepLines)],
    ];
    for (const [heading, tbl] of blocks) if (tbl) out.push(``, heading, ``, tbl);
  }

  const renderRows = sections.flatMap((section) => section.rtRows);
  const noForcedLayouts = renderRows.length > 0 && renderRows.every((row) =>
    row.chrome?.forcedLayoutCount === 0 && row.firefox?.forcedLayoutCount === 0);
  if (noForcedLayouts) out.push("", "**No forced layouts observed in this profiling run.**");

  const buildtimeTbl = buildtimeTable(buildtime);
  if (buildtimeTbl) out.push("", "## Build time — full client build, lower is better", "", buildtimeTbl);

  out.push(
    "",
    "## How this was measured",
    "",
    "- **microbench** — an in-process Node loop that renders each workload to an HTML string (`renderToString`) and counts instance renders per second.",
    "- **autocannon** — HTTP_METHOD",
    "- **[web-performance-debugger](https://github.com/jantimon/web-performance-debugger)** — records CPU and render profiles in Chrome, Firefox and Node and attributes the time to libraries and functions through source maps.",
    "",
    "Source, raw data and methodology: [github.com/jantimon/css-in-js-bench](https://github.com/jantimon/css-in-js-bench). Run it locally: clone the repo, `pnpm install`, then `pnpm report` renders this report from the committed samples — `pnpm gen` re-measures everything on your own machine.",
  );
  return (out.join("\n") + "\n").replaceAll("WPD_VERSION", wpdVersion).replaceAll("HTTP_METHOD", httpMeasurementNote(httpProtocol));
}
