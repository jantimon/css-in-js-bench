// report — the ONE render script (§10). Reads result/ (raw samples + the snapshot
// triplets) and techs/*/package.json (label/colour/cssKind), reduces samples to a
// statistic at render time, Shiki-highlights the TSX/HTML/CSS at build time, and
// emits a self-contained BENCHMARK.html via renderToStaticMarkup — no client React,
// no hydration. It reads ONLY result/ + package.json, never the tech sources (§10.2),
// which keeps it decoupled for extraction.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync, existsSync, readdirSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeHighlighter } from "./report/shiki.ts";
import { median, spread } from "./report/stats.ts";
import { interactionTimings, interactionProfiles, hasInteractionProvenance } from "./report/interaction.ts";
import { httpResults, httpMeasurementNote, assertHttpCheckpointReady } from "./report/http-results.ts";
import { CASE_PRIORITY } from "./report/priority.ts";
import { groupTechs } from "./report/families.ts";
import { BarChart, type Bar } from "./report/components/BarChart.tsx";
import { AttributionChart, type AttrRow } from "./report/components/AttributionChart.tsx";
import { InfoTip } from "./report/components/InfoTip.tsx";
import { niceScale, tickText } from "./report/components/Axis.tsx";
import benchConfig from "./bench.config.ts";
import { LineChart, type SweepLine } from "./report/components/LineChart.tsx";
import { StackChart, type StackRow } from "./report/components/StackChart.tsx";
import { RenderTimingChart, type RenderTimingRow } from "./report/components/RenderTimingChart.tsx";
import { BuildTimeChart, type BuildTimeRow } from "./report/components/BuildTimeChart.tsx";
import { SEGMENTS, WpdBreakdownChart, type WpdBreakdownRow } from "./report/components/WpdBreakdownChart.tsx";
import { TimingProfilePair } from "./report/components/TimingProfilePair.tsx";
import { Editor, type EditorLane } from "./report/components/Editor.tsx";
import { CaseSummary } from "./report/components/CaseSummary.tsx";
import { StudyFindings } from "./report/components/StudyFindings.tsx";
import { TechLabel } from "./report/components/TechLabel.tsx";
import type { CaseAnalysis, StudyAnalysis } from "./report/analysis-schema.ts";
import { renderMarkdown } from "./report/markdown.ts";
import { compileCodeAssets } from "./report/code-assets.ts";
import { validateWpdResults } from "./report/wpd-results.ts";
import type { AttributionSample, NsweepSample, WpdBlameSample, WpdBrowserSample, WpdFirefoxSample } from "./report/types.ts";
import type { CaseMeta, RunMeta, Snapshot, TechInfo } from "./report/types.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESULT = join(ROOT, "result");
const TECHS_DIR = join(ROOT, "techs");
const CASES_DIR = join(ROOT, "cases");

const readJson = <T,>(p: string, fallback: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

// Payload breakdown segment colours (by FIELD, not lane) — JS · CSS · HTML, matching the
// chart title order. Same hues read consistently across every lane's stacked bar.
const PAY_SEGS = [
  { label: "JS", color: "#e8a33d" },
  { label: "CSS", color: "#4c6ef5" },
  { label: "HTML", color: "#868e96" },
];

async function loadTechs(): Promise<Record<string, TechInfo>> {
  const out: Record<string, TechInfo> = {};
  for (const name of readdirSync(TECHS_DIR)) {
    const pkgPath = join(TECHS_DIR, name, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    out[name] = { name: pkg.name, label: pkg.description ?? pkg.name, bench: pkg.bench };
  }
  return out;
}

// A lane says no to a case with techs/<t>/case/<c>/not-compatible.md in place of an
// index.tsx. The editor lists that lane struck through and shows the note as its one tab.
// Keyed "<caseId>/<tech>" like the snapshots.
function loadNotCompatible(techs: Record<string, TechInfo>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tech of Object.keys(techs)) {
    const caseDir = join(TECHS_DIR, tech, "case");
    if (!existsSync(caseDir)) continue;
    for (const id of readdirSync(caseDir)) {
      const note = join(caseDir, id, "not-compatible.md");
      if (existsSync(note)) out[`${id}/${tech}`] = readFileSync(note, "utf8");
    }
  }
  return out;
}

async function loadCases(): Promise<Record<string, CaseMeta>> {
  const out: Record<string, CaseMeta> = {};
  for (const f of readdirSync(CASES_DIR)) {
    if (!f.endsWith(".ts")) continue;
    const id = f.replace(/\.ts$/, "");
    out[id] = (await import(pathToFileURL(join(CASES_DIR, f)).href)).default;
  }
  return out;
}

async function main() {
  assertHttpCheckpointReady(readJson<unknown>(join(RESULT, "_http-checkpoint.json"), undefined));
  const techs = await loadTechs();
  const notes = loadNotCompatible(techs);
  const cases = await loadCases();
  const wpdManifest = validateWpdResults(RESULT);
  const wpdVersion = wpdManifest.wpd.version;
  const micro = readJson<Record<string, number[]>>(join(RESULT, "measurement-microbench.json"), {});
  const pay = readJson<Record<string, { js: number; css: number; html: number }[]>>(join(RESULT, "measurement-payload.json"), {});
  const http = httpResults(readJson<Record<string, unknown>>(join(RESULT, "measurement-autocannon.json"), {}));
  const acan = http.samples;
  const httpNote = httpMeasurementNote(http.protocol);
  const wpdSsr = readJson<Record<string, AttributionSample[]>>(join(RESULT, "measurement-wpd-ssr.json"), {});
  const hyd = readJson<Record<string, number[]>>(join(RESULT, "measurement-hydrate.json"), {});
  const inp = interactionTimings(readJson<Record<string, unknown>>(join(RESULT, "measurement-inp.json"), {}));
  const mount = readJson<Record<string, number[]>>(join(RESULT, "measurement-mount.json"), {});
  const nsweep = readJson<Record<string, NsweepSample[]>>(join(RESULT, "measurement-nsweep.json"), {});
  const wpdHydrate = readJson<Record<string, WpdBrowserSample[]>>(join(RESULT, "measurement-wpd-hydrate.json"), {});
  const wpdInp = interactionProfiles(readJson<Record<string, WpdBrowserSample[]>>(join(RESULT, "measurement-wpd-inp.json"), {}));
  const wpdMount = readJson<Record<string, WpdBrowserSample[]>>(join(RESULT, "measurement-wpd-mount.json"), {});
  const wpdFirefox = readJson<Record<string, WpdFirefoxSample[]>>(join(RESULT, "measurement-wpd-firefox.json"), {});
  const wpdBlame = readJson<Record<string, WpdBlameSample[]>>(join(RESULT, "measurement-wpd-blame.json"), {});
  const shots = readJson<Record<string, string[]>>(join(RESULT, "measurement-screenshots.json"), {});
  // buildtime is keyed per LANE (tech name), not per cell — one client build compiles every workload.
  const buildtime = readJson<Record<string, { cold: number[]; warm?: number[] }>>(join(RESULT, "measurement-buildtime.json"), {});
  const snaps = readJson<Record<string, Snapshot>>(join(RESULT, "snapshot.json"), {});
  // LLM-written per-case analyses (result/analysis/<caseId>.json) — optional like any
  // other result file; require matching interaction provenance as well as case identity.
  const analysisDir = join(RESULT, "analysis");
  const analyses: Record<string, CaseAnalysis> = {};
  if (existsSync(analysisDir)) {
    for (const f of readdirSync(analysisDir)) {
      if (!f.endsWith(".json")) continue;
      const a = readJson<CaseAnalysis | null>(join(analysisDir, f), null);
      if (a && a.schemaVersion === 1 && a.caseId === f.replace(/\.json$/, "") && hasInteractionProvenance(a)) analyses[a.caseId] = a;
    }
  }
  const studyData = readJson<StudyAnalysis | null>(join(analysisDir, "study.json"), null);
  const study = hasInteractionProvenance(studyData) ? studyData : null;

  // Screenshots live in result/assets/; mirror them next to BENCHMARK.html so the
  // self-contained report can reference assets/<…>.avif (§10.6 — single file except images).
  const assetsSrc = join(RESULT, "assets");
  const assetsDst = join(ROOT, "assets");
  rmSync(assetsDst, { recursive: true, force: true });
  if (existsSync(assetsSrc)) cpSync(assetsSrc, assetsDst, { recursive: true });
  // Technology logos (report/logos/*.avif) — mirror into assets/logos/ so <img src="assets/logos/…">
  // resolves both from BENCHMARK.html on disk and inside BENCHMARK.zip.
  const logosSrc = join(ROOT, "report", "logos");
  if (existsSync(logosSrc)) cpSync(logosSrc, join(assetsDst, "logos"), { recursive: true });
  // The social card (report/social-card.jpg, 1200×630) — mirrored next to the logos so the
  // absolute og:image URL below resolves on the deployed site. JPEG, not AVIF: link
  // unfurlers (Twitter, Discord, Slack) only fetch PNG/JPEG cards.
  cpSync(join(ROOT, "report", "social-card.jpg"), join(assetsDst, "social-card.jpg"));
  const baseMeta = readJson<RunMeta | null>(join(RESULT, "meta.json"), null);
  const meta: RunMeta = {
    ...(baseMeta ?? { techs: [], cases: [] }),
    host: wpdManifest.environment.host,
    node: wpdManifest.environment.node,
    timestamp: Object.values(wpdManifest.lanes).map((lane) => lane!.finishedAt).sort().at(-1)!,
    gitSha: wpdManifest.environment.gitSha,
    browsers: { chrome: wpdManifest.wpd.chrome, firefox: wpdManifest.wpd.firefox },
  };
  const hl = await makeHighlighter();
  // Compile the per-cell editor files into assets/code/ (after the assets copy above, so
  // it isn't wiped). The report references them from the <iframe> editor by convention.
  await compileCodeAssets(snaps, techs, hl, join(assetsDst, "code"));

  // cases that actually have data, ordered by the editorial priority map (§10.8).
  const caseIds = Object.keys(cases)
    .filter((c) => Object.keys(micro).some((k) => k.startsWith(`${c}/`)) || Object.keys(snaps).some((k) => k.startsWith(`${c}/`)))
    .sort((a, b) => (CASE_PRIORITY[b] ?? 0) - (CASE_PRIORITY[a] ?? 0) || a.localeCompare(b));

  const usedTechs = [...new Set(Object.keys(snaps).map((k) => k.split("/")[1]))].filter((t) => techs[t]);
  const techGroups = groupTechs(usedTechs, (t) => techs[t].bench.framework ?? "react");
  const snapshotN = baseMeta?.snapshotN ?? 2; // instances in each snapshot html (bench.config snapshotN)

  // buildtime: one lane-level bar — median cold client build, warm + cssKind as context. Only
  // lanes with cold samples appear; empty on older result/ data (the whole section is dropped).
  const buildRows: BuildTimeRow[] = usedTechs
    .filter((t) => buildtime[t]?.cold?.length)
    .map((t) => {
      const { cold, warm } = buildtime[t];
      return {
        tech: t,
        label: techs[t].label,
        color: techs[t].bench.color,
        cssKind: techs[t].bench.cssKind,
        coldMs: median(cold),
        coldSpread: spread(cold),
        warmMs: warm?.length ? median(warm) : undefined,
      };
    });

  const sections = caseIds.map((caseId) => {
    const cm = cases[caseId];
    const bars: Bar[] = usedTechs
      .filter((t) => micro[`${caseId}/${t}`])
      .map((t) => {
        const xs = micro[`${caseId}/${t}`];
        const value = median(xs); // instance renders per second (gen.ts microbench)
        // ms per 1,000 DOM elements: element count per instance from the snapshot html
        // (snapshotN instances) — normalizes heavy vs light workloads across cases.
        const snapHtml = snaps[`${caseId}/${t}`]?.html;
        const elemsPerInstance = snapHtml ? (snapHtml.match(/<[a-zA-Z]/g) ?? []).length / snapshotN : 0;
        const msPer1kElems = value > 0 && elemsPerInstance > 0 ? 1e6 / (value * elemsPerInstance) : undefined;
        return { tech: t, label: techs[t].label, color: techs[t].bench.color, value, spread: spread(xs), msPer1kElems };
      });
    // payload: page bytes shipped, broken into JS · CSS · HTML (gzipped) — lower better.
    const payRows: StackRow[] = usedTechs
      .filter((t) => pay[`${caseId}/${t}`]?.[0])
      .map((t) => {
        const p = pay[`${caseId}/${t}`][0];
        return { tech: t, label: techs[t].label, total: p.js + p.css + p.html, values: [p.js, p.css, p.html] };
      });
    // autocannon: SSR requests/sec under HTTP load (higher better) — optional/heavy.
    const acanBars: Bar[] = usedTechs
      .filter((t) => acan[`${caseId}/${t}`]?.length)
      .map((t) => {
        const xs = acan[`${caseId}/${t}`];
        return { tech: t, label: techs[t].label, color: techs[t].bench.color, value: median(xs), spread: spread(xs) };
      });
    // attribution: SSR render time split by package (react / lib / component / other).
    const attrRows: AttrRow[] = usedTechs
      .filter((t) => wpdSsr[`${caseId}/${t}`]?.[0])
      .map((t) => {
        const s = wpdSsr[`${caseId}/${t}`][0];
        return { tech: t, label: techs[t].label, renderMs: s.renderMs, react: s.react, lib: s.lib, component: s.component, other: s.other };
      });
    // hydrate: client hydration time (ms, lower better) — optional/heavy.
    const hydBars: Bar[] = usedTechs
      .filter((t) => hyd[`${caseId}/${t}`]?.length)
      .map((t) => {
        const xs = hyd[`${caseId}/${t}`];
        return { tech: t, label: techs[t].label, color: techs[t].bench.color, value: median(xs), spread: spread(xs) };
      });
    // inp: warm input change through the first rAF callback (ms, lower better).
    const inpBars: Bar[] = usedTechs
      .filter((t) => inp[`${caseId}/${t}`]?.length)
      .map((t) => {
        const xs = inp[`${caseId}/${t}`];
        return { tech: t, label: techs[t].label, color: techs[t].bench.color, value: median(xs), spread: spread(xs) };
      });
    // mount: cold client mount of the workload into a blank root (ms, lower better) — optional/heavy.
    const mountBars: Bar[] = usedTechs
      .filter((t) => mount[`${caseId}/${t}`]?.length)
      .map((t) => {
        const xs = mount[`${caseId}/${t}`];
        return { tech: t, label: techs[t].label, color: techs[t].bench.color, value: median(xs), spread: spread(xs) };
      });
    const wpdRows = (data: Record<string, WpdBrowserSample[]>): WpdBreakdownRow[] => usedTechs
      .filter((t) => data[`${caseId}/${t}`]?.[0]?.span)
      .map((t) => {
        const sample = data[`${caseId}/${t}`][0];
        const timing = sample.timing;
        return {
          tech: t, label: techs[t].label, span: sample.span!, timing,
          medianMs: timing?.stats?.medianMs,
        };
      });
    const hydWpdRows = wpdRows(wpdHydrate);
    const inpWpdRows = wpdRows(wpdInp);
    const mountWpdRows = wpdRows(wpdMount);
    // nsweep: render time vs instance count (one line per lane) — optional/heavy.
    const sweepLines: SweepLine[] = usedTechs
      .filter((t) => nsweep[`${caseId}/${t}`]?.length)
      .map((t) => ({ tech: t, label: techs[t].label, color: techs[t].bench.color, points: nsweep[`${caseId}/${t}`] }));
    // Browser rendering work on a cold mount, from the WPD run group. Chrome's row is the stitched
    // render-timing metric gen-wpd already reconciled from `query span <group> run`: durations from
    // the breakdown member, exact counts + forced sites from the deep member of ONE capture (the
    // group join guarantees they describe the same workload). Firefox's row is the Gecko sampled
    // bar. No per-field stitching here.
    const rtRows: RenderTimingRow[] = usedTechs
      .filter((t) => wpdBlame[`${caseId}/${t}`]?.[0])
      .map((t) => {
        const rt = wpdBlame[`${caseId}/${t}`][0];
        const ff = wpdFirefox[`${caseId}/${t}`]?.[0];
        const chrome = {
          layoutCount: rt.layoutCount, layoutMs: rt.layoutMs,
          styleCount: rt.styleCount, styleMs: rt.styleMs,
          paintCount: rt.paintCount, paintMs: rt.paintMs,
          forcedLayoutCount: rt.forcedLayoutCount, forcedLayoutMs: rt.forcedLayoutMs,
        };
        const firefox = ff
          ? {
            layoutCount: ff.counts.layout, layoutMs: ff.breakdown?.layout ?? null,
            styleCount: ff.counts.style, styleMs: ff.breakdown?.style ?? null,
            paintCount: ff.counts.paint, paintMs: null,
            forcedLayoutCount: ff.counts.forcedLayout, forcedLayoutMs: null,
          }
          : undefined;
        return { tech: t, label: techs[t].label, n: wpdManifest.config.n, chrome, firefox };
      });
    // editor lanes = lanes that captured a source snapshot (the iframe files exist for them),
    // each with its rendered-preview image (if screenshots ran) so the editor's "preview" tab
    // can show that lane's output inline — plus, struck through, the lanes that hold a
    // not-compatible.md for this case instead of a cell. Same order as everywhere else.
    const editorLanes: EditorLane[] = usedTechs
      .filter((t) => snaps[`${caseId}/${t}`] || notes[`${caseId}/${t}`])
      .map((t) =>
        snaps[`${caseId}/${t}`]
          ? { tech: t, label: techs[t].label, preview: shots[`${caseId}/${t}`]?.[0], files: snaps[`${caseId}/${t}`].files.map((f) => f.name) }
          : { tech: t, label: techs[t].label, files: [], note: notes[`${caseId}/${t}`] },
      );
    return { caseId, cm, bars, payRows, acanBars, attrRows, hydBars, hydWpdRows, inpBars, inpWpdRows, mountBars, mountWpdRows, sweepLines, rtRows, editorLanes, analysis: analyses[caseId] ?? null };
  });

  const doc = (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CSS-in-JS benchmarks</title>
        <meta
          name="description"
          content="A neutral, reproducible comparison of CSS-in-JS and utility styling strategies for React — SSR throughput, payload size, hydration and interaction cost, measured on identical workloads."
        />
        <meta property="og:title" content="CSS-in-JS benchmarks" />
        <meta
          property="og:description"
          content="styled-components, Emotion, Goober, @yak/react, StyleX, Panda, Tailwind — identical workloads, measured SSR + client cost."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jantimon.github.io/css-in-js-bench/" />
        <meta property="og:image" content="https://jantimon.github.io/css-in-js-bench/assets/social-card.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="CSS-in-JS Bench: a product-grid preview beside a blurred SSR render throughput chart" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CSS-in-JS benchmarks" />
        <meta
          name="twitter:description"
          content="styled-components, Emotion, Goober, @yak/react, StyleX, Panda, Tailwind — identical workloads, measured SSR + client cost."
        />
        <meta name="twitter:image" content="https://jantimon.github.io/css-in-js-bench/assets/social-card.jpg" />
        <link rel="canonical" href="https://jantimon.github.io/css-in-js-bench/" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <header className="page-head">
          {/* Desktop: a corner link to the source; below 768px the icon next to the title takes its place. */}
          <a
            className="gh-corner"
            href="https://github.com/jantimon/css-in-js-bench"
            aria-label="View source on GitHub"
            data-screen-only
            dangerouslySetInnerHTML={{ __html: GH_CORNER_SVG }}
          />
          <div className="head-inner">
            <div className="brand">
              <h1>
                <span className="brand-dot" /> CSS-in-JS benchmarks
                <a
                  className="gh-link"
                  href="https://github.com/jantimon/css-in-js-bench"
                  aria-label="View on GitHub"
                  title="View on GitHub"
                >
                  <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                    />
                  </svg>
                </a>
              </h1>
              <p className="sub">
                We built the same components with <mark className="hl">{usedTechs.length} different CSS approaches</mark>, from runtime{" "}
                <span className="nowrap">CSS-in-JS</span> to build-time and utility CSS. See how your styling choice affects the experience of{" "}
                <mark className="hl">your users</mark>: how long the server takes to render, how much they download, and how fast
                the page starts and responds in their browser
              </p>
              <HeadPipeline />
              <div className="head-stats">
                <span>
                  <b>{usedTechs.length}</b> CSS approaches
                </span>
                <span>
                  <b>{caseIds.length}</b> test {caseIds.length === 1 ? "page" : "pages"}
                </span>
                <span>production builds</span>
                <span>median of repeated runs</span>
              </div>
            </div>
          </div>
        </header>



        <main className="wrap">
          {/* Contents index. The rail is absolute, so it takes no room in the flow and the
              filter panel stays where it is; the nav inside is sticky, so it rides along and
              stops at the end of the measure. Hidden below the width where the gutter exists
              (see the .toc-rail media query). The controller marks the active entry from an
              IntersectionObserver, so it tracks scrolling too. */}
          <div className="toc-rail" data-screen-only>
            <nav className="toc" aria-label="Report sections">
              <span className="toc-title">Contents</span>
              <ol>
                <li>
                  <a href="#filters" data-toc="filters">Filters</a>
                </li>
                {study ? (
                  <li>
                    <a href="#key-findings" data-toc="key-findings">Key findings</a>
                  </li>
                ) : null}
                {sections.map(({ caseId, cm }) => {
                  const [title, sub] = cm.label.split(/\s+—\s+/, 2);
                  return (
                    <li key={caseId}>
                      <a href={`#${caseId}`} data-toc={caseId} title={cm.label}>
                        {title}
                        {sub ? <span className="toc-sub">{sub}</span> : null}
                      </a>
                    </li>
                  );
                })}
                {buildRows.length ? (
                  <li>
                    <a href="#buildtime" data-toc="buildtime">Build time</a>
                  </li>
                ) : null}
                <li>
                  <a href="#how-measured" data-toc="how-measured">How this was measured</a>
                </li>
              </ol>
            </nav>
          </div>
          <section className="filter-panel" id="filters" data-screen-only>
            <div className="fp-block fp-toggle">
              <span className="fp-sub-title">Show source and preview</span>
              <div className="seg" role="group" aria-label="Show source and preview">
                <button type="button" className="seg-btn active" data-code-toggle="1" aria-pressed="true">
                  Yes
                </button>
                <button type="button" className="seg-btn" data-code-toggle="0" aria-pressed="false">
                  No
                </button>
              </div>
            </div>
            <div className="fp-block">
              <div className="fp-sub">
                <span className="fp-sub-title">Technologies</span>
                <span className="tp-count"><span data-tech-count>{usedTechs.length}</span> / {usedTechs.length} shown</span>
                <span className="tp-actions">
                  <button type="button" data-tech-all>
                    All
                  </button>
                  <span className="tp-sep">·</span>
                  <button type="button" data-tech-none>
                    None
                  </button>
                </span>
              </div>
              {techGroups.map((g) => (
                <div className="tp-row" key={g.group}>
                  <button type="button" className="tp-group active" data-group-filter={g.group} title={`Show every ${g.group} lane`}>{g.group}</button>
                  <div className="tp-engines">
                    {g.rows.map((row) => (
                      <div className="tp-engine-row" key={row.engine}>
                        <button type="button" className="tp-engine active" data-engine-filter={row.engine} title={`Show every ${row.label} styling technique`}>
                          <img className="tp-engine-logo" src={`assets/logos/${row.engine}.svg`} alt="" loading="lazy" />
                          {row.label}
                        </button>
                        <div className="tp-pills">
                          {row.items.map((it) => (
                            <button type="button" className="tech-pill active" data-tech-filter={it.tech} data-engine={row.engine} data-group={g.group} data-floor={g.floor ? "1" : undefined} data-default-off={techs[it.tech].bench.defaultOff ? "1" : undefined} title={techs[it.tech].label} key={it.tech}>
                              <span className="tp-swatch" style={{ background: techs[it.tech].bench.color }} />
                              <TechLabel tech={it.tech} label={it.short} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="fp-block">
              <div className="fp-sub">
                <span className="fp-sub-title">Benchmarks</span>
                <span className="tp-count"><span data-measure-count>{MEASURE_COUNT}</span> / {MEASURE_COUNT} shown</span>
                <span className="tp-actions">
                  <button type="button" data-measure-all>
                    All
                  </button>
                  <span className="tp-sep">·</span>
                  <button type="button" data-measure-none>
                    None
                  </button>
                </span>
              </div>
              {MEASURE_GROUPS.map((g) => (
                <div className="tp-row" key={g.group}>
                  <span className="tp-group">{g.group}</span>
                  <div className="tp-pills">
                    {g.items.map(([k, label]) => (
                      <button type="button" className="show-pill active" data-measure-filter={k} aria-pressed="true" key={k}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {study ? <StudyFindings study={study} techs={techs} runSha={meta.gitSha} caseIds={caseIds} /> : null}

          {sections.map(({ caseId, cm, bars, payRows, acanBars, attrRows, hydBars, hydWpdRows, inpBars, inpWpdRows, mountBars, mountWpdRows, sweepLines, rtRows, editorLanes, analysis }) => {
            const [caseTitle, caseSub] = cm.label.split(/\s+—\s+/, 2);
            return (
            <details className="case" id={caseId} open key={caseId}>
              <summary>
                <span className="case-title">{caseTitle}</span>
                {caseSub ? <span className="case-sub">{caseSub}</span> : null}
              </summary>
              <p className="case-desc">{cm.description}</p>
              {analysis ? <CaseSummary analysis={analysis} runSha={meta.gitSha} caseIds={caseIds} /> : null}
            <div data-measure="code" data-screen-only>
              <h3 className="chart-title">Source and output<HideMeasure k="code" /></h3>
              <Editor caseId={caseId} lanes={editorLanes} caseIds={caseIds} />
            </div>
            <div data-group="Server" data-measure="microbench">
              <div className="ch-head">
                <div className="ch-text">
                  <h3 className="chart-title">
                    SSR render throughput
                    <InfoTip>
                      How many components Node renders to an HTML string per second.
                      <span className="tip-p">Measured with tinybench: each sample renders all components of this page once, after a warm-up and a full garbage collection. Only rendering is timed; building, HTTP and the browser are left out.</span>
                      <span className="tip-p">Every component counts: a page of 400 product cards counts as 400 renders.</span>
                    </InfoTip>
                    <HideMeasure k="microbench" />
                  </h3>
                  <p className="ch-cap">Components rendered to HTML per second on the server (higher is faster)</p>
                </div>
                <a className="tool-mark" href="https://github.com/tinylibs/tinybench" aria-label="tinybench by Mohammad Bagher Abiyat">
                  <span className="tip">tinybench is an npm package that times a JavaScript function over many runs. We use tinybench to time how fast each library renders the page to HTML in Node. By Mohammad Bagher Abiyat.</span>
                <span className="tm-word">tiny<b>bench</b></span>
                <img className="tm-av" src="assets/logos/aslemammad.avif" alt="" width={18} height={18} loading="lazy" />
              </a>
              </div>
              <BarChart bars={bars} unit="renders/s" higherBetter />
            </div>
            {acanBars.length ? (
              <div data-measure="autocannon">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      SSR throughput under load
                      <InfoTip>
                        How many whole pages a Node server delivers per second while many clients ask at once.
                        <span className="tip-p">Measured with autocannon on this machine: each request renders all components of this page to HTML and sends the response back, over several open connections. Building, browser work and real network delay are left out.</span>
                        <span className="tip-p">One request is one whole page: a page of 400 product cards counts as one request.</span>
                      </InfoTip>
                      <HideMeasure k="autocannon" />
                    </h3>
                    <p className="ch-cap">HTTP requests per second, each rendering the whole page (higher is faster)</p>
                  </div>
                  <a className="tool-mark" href="https://github.com/mcollina/autocannon" aria-label="autocannon by Matteo Collina">
                  <span className="tip">autocannon is an npm package that sends HTTP requests to a server as fast as it answers and counts them per second. We use autocannon to simulate high traffic on a Node server rendering the HTML. By Matteo Collina.</span>
                  <img className="tm-logo" src="assets/logos/autocannon.avif" alt="" width={18} height={18} loading="lazy" />
                  <span className="tm-name">autocannon</span>
                  <img className="tm-av" src="assets/logos/mcollina.avif" alt="" width={18} height={18} loading="lazy" />
                </a>
                </div>
                <BarChart bars={acanBars} unit="req/s" higherBetter />
                <p className="rt-note">{httpNote}</p>
              </div>
            ) : null}
            {attrRows.length ? (
              <div data-measure="attribution">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      SSR render time split
                      <InfoTip>
                        Where one server render spends its time: the <b>UI framework</b> (React or Solid), the <b>styling library</b> and <b>your components</b>. <b>other</b> is garbage collection and work inside Node.
                        <span className="tip-p">Taken from a sampled CPU profile, matched back to the source files. Framework time can differ between libraries when a library removes component calls.</span>
                        <span className="tip-p tip-src">Tool: web-performance-debugger {wpdVersion}</span>
                      </InfoTip>
                      <HideMeasure k="attribution" />
                    </h3>
                    <p className="ch-cap">Server render time, split into framework, styling library and your components (lower is faster)</p>
                  </div>
                </div>
                <AttributionChart rows={attrRows} />
              </div>
            ) : null}
            {sweepLines.length ? (
              <div data-measure="nsweep">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      Scaling
                      <InfoTip>
                        Server render time as the page grows from a handful of components to thousands.
                        <span className="tip-p">A flatter line means each extra component adds the same small cost, however big the page gets.</span>
                      </InfoTip>
                      <HideMeasure k="nsweep" />
                    </h3>
                    <p className="ch-cap">Server render time as the number of components grows (flatter is better)</p>
                  </div>
                </div>
                <LineChart lines={sweepLines} />
              </div>
            ) : null}
            {hydWpdRows.length || hydBars.length ? (
              <div data-group="Browser" data-measure="hydrate">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      Client hydration
                      <InfoTip>
                        How long the framework needs to take over the HTML the server sent: it attaches event handlers and sets up state without rebuilding the markup. This step is called <b>hydration</b>.
                        <span className="tip-p">The median duration starts on a fully loaded page and stops when the framework has written to the page (React's useLayoutEffect, Solid's flush), before the browser paints.</span>
                        <span className="tip-p">The breakdown comes from a separate Chrome profile that runs until the next frame is drawn, so it also includes style, layout and paint.</span>
                        <span className="tip-p tip-src">Tool: web-performance-debugger {wpdVersion}</span>
                      </InfoTip>
                      <HideMeasure k="hydrate" />
                    </h3>
                    <p className="ch-cap">Time to boot the client-side JavaScript on the server-rendered page (lower is faster)</p>
                  </div>
                </div>
                <TimingProfilePair bars={hydBars} rows={hydWpdRows} wpdVersion={wpdVersion} profileN={benchConfig.wpd.n} caseN={cm.n} />
              </div>
            ) : null}
            {inpWpdRows.length || inpBars.length ? (
              <div data-measure="inp">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      Interaction update
                      <InfoTip>
                        How long it takes until every component shows a new value after one state change. Each value goes from <code>i</code> to <code>i + 1</code>, so every element really updates: React sets state, Solid sets a signal.
                        <span className="tip-p">Both run a few times first, and resetting the values is not timed. Timing stops at the first animation frame; the Chrome profile runs one frame longer to include the browser's rendering work. This is not the same as Google's INP metric.</span>
                        <span className="tip-p">The times include the framework itself, so compare against the vanilla version with plain CSS. Compilers and runtime libraries can also remove some component work.</span>
                      </InfoTip>
                      <HideMeasure k="inp" />
                    </h3>
                    <p className="ch-cap">Time to re-render every component after one state change (lower is faster)</p>
                  </div>
                </div>
                <TimingProfilePair bars={inpBars} rows={inpWpdRows} wpdVersion={wpdVersion} profileN={benchConfig.wpd.n} caseN={cm.n} />
              </div>
            ) : null}
            {mountWpdRows.length || mountBars.length ? (
              <div data-measure="mount">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      Cold mount
                      <InfoTip>
                        How long it takes to render all components into an empty part of an already loaded page.
                        <span className="tip-p">Timing stops when the framework has written to the page, before paint; page load and network are not included. A library that creates CSS at runtime may insert its styles during this step.</span>
                        <span className="tip-p">The Chrome profile is a separate run that also includes the next frame's style, layout and paint.</span>
                      </InfoTip>
                      <HideMeasure k="mount" />
                    </h3>
                    <p className="ch-cap">Time to render all components into an empty page in the browser (lower is faster)</p>
                  </div>
                </div>
                <TimingProfilePair bars={mountBars} rows={mountWpdRows} wpdVersion={wpdVersion} profileN={benchConfig.wpd.n} caseN={cm.n} />
              </div>
            ) : null}
            {rtRows.length ? (
              <div data-measure="render-timing">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      Browser render work
                      <InfoTip>
                        The browser's own work after the components appear: recalculating styles, layout and painting, not JavaScript.
                        <span className="tip-p">Libraries that write CSS at runtime can make this slower: if they add a style rule per component, the browser recalculates styles once per component instead of once for the page. Chrome counts how often it recalculated styles; a badge shows the count when it is not one.</span>
                        <span className="tip-p">Firefox reports sampled times instead, where a zero can mean the sample missed the work. Compare values within one browser.</span>
                      </InfoTip>
                      <HideMeasure k="render-timing" />
                    </h3>
                    <p className="ch-cap">Browser style, layout and paint time when the components first appear (lower is faster)</p>
                  </div>
                </div>
                <RenderTimingChart rows={rtRows} />
              </div>
            ) : null}
            {payRows.length ? (
              <div data-group="Network" data-measure="payload">
                <div className="ch-head">
                  <div className="ch-text">
                    <h3 className="chart-title">
                      Page bytes
                      <InfoTip>
                        How many gzipped bytes the browser downloads: the JavaScript the styling library adds on top of a page with only the framework, the CSS, and the HTML from the server.
                        <span className="tip-p">Solid marks every element with a hydration key and React does not, so Solid pages carry more HTML. Keep that in mind when you compare across frameworks.</span>
                      </InfoTip>
                      <HideMeasure k="payload" />
                    </h3>
                    <p className="ch-cap">Gzipped kilobytes of JavaScript, CSS and HTML (lower is better)</p>
                  </div>
                  <img className="chart-banner" src="assets/logos/payload-banner.avif" alt="" width={180} height={60} loading="lazy" data-screen-only />
                </div>
                <StackChart rows={payRows} segs={PAY_SEGS} unit="B" higherBetter={false} />
              </div>
            ) : null}
            </details>
            );
          })}
          {buildRows.length ? (
            <section className="buildtime" data-measure="buildtime" id="buildtime">
              <div className="ch-head">
                <div className="ch-text">
                  <h3 className="chart-title">
                    Build time
                    <InfoTip>
                      How long a full production build takes, for the same bundle that page bytes measures.
                      <span className="tip-p"><b>cold</b> deletes caches and generated code first, so it includes regenerating them; <b>warm</b> runs the build again with nothing deleted. Median of 3 runs.</span>
                      <span className="tip-p">This affects developers, not users, and depends on the machine.</span>
                    </InfoTip>
                    <HideMeasure k="buildtime" />
                  </h3>
                  <p className="ch-cap">Time for a full production build (lower is faster)</p>
                </div>
              </div>
              <BuildTimeChart rows={buildRows} />
            </section>
          ) : null}
          <section className="outro" id="how-measured">
            <h3 className="chart-title">How this was measured</h3>
            <ul className="outro-tools">
              <li><b><a href="https://github.com/tinylibs/tinybench">tinybench</a></b>: renders each test page to an HTML string in Node and counts component renders per second. A full garbage collection runs before every sample.</li>
              <li><b>autocannon</b>: {httpNote}</li>
              <li><b><a href="https://github.com/jantimon/web-performance-debugger">web-performance-debugger</a></b>: records CPU and render profiles in Chrome, Firefox and Node and matches the time to libraries and functions through source maps.</li>
            </ul>
            <p className="outro-run">
              Source, raw data and methodology: <a href="https://github.com/jantimon/css-in-js-bench">github.com/jantimon/css-in-js-bench</a>.
              Run it locally: clone the repo, <code>pnpm install</code>, then <code>pnpm report</code> renders this report from the committed
              samples, and <code>pnpm gen:samples</code> measures again on your own machine. See <a href="https://github.com/jantimon/css-in-js-bench/blob/main/local-development.md">local development</a>.
            </p>
          </section>
        </main>

        <footer className="page-foot">
          Raw samples in <code>result/</code> · statistic: median · generated by <code>report.tsx</code>
          {meta ? ` · ${meta.node} · ${meta.host} · ${new Date(meta.timestamp).toLocaleString()}` : ""}
        </footer>
        <script dangerouslySetInnerHTML={{ __html: CONTROLLER }} />
      </body>
    </html>
  );

  const html = "<!doctype html>\n" + renderToStaticMarkup(doc);
  writeFileSync(join(ROOT, "BENCHMARK.html"), html);

  // Agent-readable markdown companion — every chart as a data table, curated to a handful of
  // techs, source links instead of the code editor, and the measurement definitions once up top.
  writeFileSync(join(ROOT, "BENCHMARK.md"), renderMarkdown(sections, techs, meta, wpdVersion, study, buildRows, http.protocol));

  // Machine-readable companion: the same reduced section data the charts render, all lanes,
  // one file. This is what the analysis prompt (scripts/prompts/case-analysis.md) reads.
  const jsonOut = {
    schemaVersion: 1,
    meta,
    wpdVersion,
    httpProtocol: http.protocol,
    study,
    techs: Object.fromEntries(usedTechs.map((t) => [t, { label: techs[t].label, ...techs[t].bench }])),
    // Lane-level (one client build per tech), so it sits alongside `cases`, not inside it.
    buildtime: buildRows,
    cases: sections.map(({ caseId, cm, bars, payRows, acanBars, attrRows, hydBars, hydWpdRows, inpBars, inpWpdRows, mountBars, mountWpdRows, sweepLines, rtRows, analysis }) => ({
      caseId,
      meta: cm,
      microbench: bars,
      autocannon: acanBars,
      attribution: attrRows,
      hydrate: { bars: hydBars, wpd: hydWpdRows },
      inp: { bars: inpBars, wpd: inpWpdRows },
      mount: { bars: mountBars, wpd: mountWpdRows },
      renderTiming: rtRows,
      payload: payRows,
      nsweep: sweepLines,
      analysis,
    })),
  };
  writeFileSync(join(ROOT, "BENCHMARK.json"), JSON.stringify(jsonOut, null, 2) + "\n");

  console.log(`✓ wrote BENCHMARK.html + BENCHMARK.md + BENCHMARK.json — ${sections.length} case(s), ${usedTechs.length} lane(s)`);

  // Bundle the report into a single self-contained BENCHMARK.zip (the html + every asset it
  // references: screenshots and the iframe code files under assets/) so it can be sent as one
  // file and opened from disk. Shells out to `zip` (zero deps); skipped with a note if absent.
  const zipParts = ["BENCHMARK.html", "BENCHMARK.md", "BENCHMARK.json", ...(existsSync(join(ROOT, "assets")) ? ["assets"] : [])];
  rmSync(join(ROOT, "BENCHMARK.zip"), { force: true }); // rebuild, don't append into a stale archive
  try {
    execFileSync("zip", ["-r", "-q", "-X", "BENCHMARK.zip", ...zipParts], { cwd: ROOT });
    console.log(`✓ bundled BENCHMARK.zip — ${zipParts.join(" + ")}`);
  } catch {
    console.warn("  ⚠ BENCHMARK.zip skipped — the `zip` command isn't available on PATH.");
  }
}

const CSS = `
:root{--bg:#080a0d;--panel:#0d1117;--panel-2:#11161d;--raised:#161b22;--raised-2:#21262d;--line:#1c2128;--line-2:#30363d;--fg:#e6edf3;--fg-2:#c9d1d9;--fg-3:#adbac7;--muted:#8b949e;--muted-2:#6e7681;--link:#58a6ff}
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding:0 0 80px}
.wrap{max-width:1000px;margin:0 auto;padding:0 24px;position:relative}
.head-inner{max-width:1000px;margin:0 auto;padding:34px 24px 30px}
h1{margin:0 0 12px;font-size:30px;font-weight:750;letter-spacing:-.02em;display:flex;align-items:center;gap:12px}
.brand-dot{width:13px;height:13px;border-radius:50%;background:#3fb950;box-shadow:0 0 0 4px #3fb9502e}
.gh-link{display:inline-flex;align-items:center;color:var(--muted);margin-left:2px}
.gh-link:hover{color:var(--fg)}
/* GitHub corner (desktop): the page's top-right corner curls down; the light reverse side carries
   the GitHub mark. Fixed to the viewport. On hover the curl opens 7%, the mark stays. */
.page-head{position:relative}
.gh-corner{position:fixed;top:0;right:0;z-index:50;width:100px;height:100px;display:none;overflow:hidden;-webkit-tap-highlight-color:transparent}
.gh-corner svg{display:block;width:100%;height:100%}
/* Hover opens the curl: the page layers (shadow, revealed area, flap, label) grow from the corner;
   the mark is printed on the surface underneath, so it stays put. */
.gh-curl{transform-box:view-box;transform-origin:100% 0;transition:transform .18s ease-out}
.gh-corner:hover .gh-curl,.gh-corner:focus-visible .gh-curl{transform:scale(1.07)}
.gh-corner:focus-visible{outline:2px solid #58a6ff;outline-offset:-2px}
.gh-corner text{font:500 39px system-ui,-apple-system,"Segoe UI",sans-serif;fill:#fff;letter-spacing:-.3px}
@media (prefers-reduced-motion:reduce){.gh-curl{transition:none}}
/* Only where the margin beside the 1000px column fits the 100px corner; narrower windows keep the
   icon next to the title. */
@media screen and (min-width:1180px){.gh-corner{display:block}h1 .gh-link{display:none}}
@media (max-width:767px){h1{font-size:24px}}
/* Two-tone emphasis, as on Linear, Vercel and Neon: the intro is muted grey and the key phrases
   are the bright text colour. Same weight, no background, so nothing shifts. */
.hl{color:var(--fg);background:none;font-weight:inherit}
.nowrap{white-space:nowrap}
@media print{.hl{font-weight:600}}
.sub{margin:0;color:var(--muted);font:18px/1.6 system-ui,sans-serif;letter-spacing:-.005em;max-width:60ch}
@media (max-width:767px){.sub{font-size:16px}}
/* Header pipeline: server, network, browser, each with the charts that measure it. */
.hp{display:grid;grid-template-columns:1fr 36px 1fr 36px 1fr;margin-top:22px}
.hp-stage{border:1px solid var(--line-2);border-radius:10px;padding:12px 14px;background:var(--raised)}
.hp-name{display:flex;align-items:center;gap:8px;font-weight:650;font-size:15px}
.hp-name span{color:var(--fg)}
.hp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.hp-chips span{font-size:11.5px;color:var(--fg-3);border:1px solid var(--line-2);border-radius:999px;padding:2px 8px}
.hp-arrow{display:flex;align-items:center;justify-content:center;color:var(--muted-2);font-size:20px}
@media (max-width:767px){.hp{grid-template-columns:1fr;gap:6px}.hp-arrow{transform:rotate(90deg);height:18px}}
.head-stats{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:16px;font-size:12.5px;color:var(--muted)}
.head-stats b{color:var(--fg);font:600 13px ui-monospace,SFMono-Regular,Menlo,monospace}
.head-stats span:not(:first-child)::before{content:"·";margin-right:10px;color:#444c56}
.show{display:flex;align-items:center;gap:10px;min-width:0}
.show-pill{flex:none;white-space:nowrap;background:var(--raised);color:var(--muted);border:1px solid var(--raised-2);border-radius:7px;padding:5px 11px;font-size:12.5px;cursor:pointer;user-select:none}
.show-pill:hover{color:var(--fg-2)}
.show-pill.active{background:var(--raised-2);color:var(--fg);border-color:var(--line-2)}
.filter-panel{border:1px solid var(--line);border-radius:12px;padding:18px 20px;background:var(--panel);margin-bottom:24px}
.fp-block+.fp-block{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.fp-sub{display:flex;align-items:baseline;margin-bottom:6px}
.fp-sub-title{font-size:14px;font-weight:650;color:var(--fg-2)}
.fp-sub .tp-count{margin-left:6px}
.fp-sub .tp-actions{margin-left:auto}
.fp-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px}
.seg{display:inline-flex;border:1px solid var(--raised-2);border-radius:999px;overflow:hidden;background:var(--raised)}
.seg-btn{background:none;border:0;color:var(--muted);padding:4px 15px;font-size:12.5px;cursor:pointer}
.seg-btn:hover{color:var(--fg-2)}
.seg-btn.active{background:var(--raised-2);color:var(--fg)}
/* Contents index. The rail spans the measure's full height just outside its right edge
   and takes no room in the flow; the nav sticks inside it. */
.toc-rail{position:absolute;top:0;bottom:0;left:calc(100% + 12px);width:188px}
.toc{position:sticky;top:20px;max-height:calc(100vh - 20px);overflow-y:auto;font-size:12.5px;line-height:1.45;scrollbar-width:none}
.toc::-webkit-scrollbar{width:0}
.toc-title{display:block;color:var(--muted-2);text-transform:uppercase;font-size:10.5px;letter-spacing:.06em;margin-bottom:8px}
.toc ol{list-style:none;margin:0;padding:0}
.toc li{margin:0}
.toc a{display:block;padding:3px 0 3px 10px;color:var(--muted);text-decoration:none;border-left:2px solid transparent}
.toc a:hover{color:var(--fg-2)}
.toc a.active{color:#fff;border-left-color:#fff}
.toc-sub{display:block;font-size:11px;opacity:.75}
/* Below this width the gutter is gone and the index would sit on top of the charts. */
@media(max-width:1420px){.toc-rail{display:none}}
.tp-count{color:var(--muted-2);font-weight:400;font-size:12.5px;margin-left:4px}
.tp-actions{font-size:12.5px;color:var(--muted)}
.tp-actions button{background:none;border:0;color:var(--link);cursor:pointer;font-size:12.5px;padding:0}
.tp-actions button:hover{text-decoration:underline}
.tp-sep{margin:0 7px;color:var(--line-2)}
.tp-row{display:flex;align-items:center;gap:16px;padding:10px 0}
.tp-engines{display:flex;flex-direction:column;gap:6px}
.tp-engine-row{display:flex;align-items:center;gap:12px}
.tp-engine{flex:0 0 58px;display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:0;text-align:left;color:var(--muted-2);font-size:10.5px;letter-spacing:.04em;cursor:pointer}
.tp-engine:hover{color:var(--fg-3)}
.tp-engine:not(.active){opacity:.45}
.tp-engine-logo{height:12px;width:auto}
.tp-group{flex:0 0 150px;background:none;border:0;padding:0;text-align:left;color:var(--muted-2);text-transform:uppercase;font-size:10.5px;letter-spacing:.06em;cursor:pointer}
.tp-group:hover{color:var(--fg-3)}
.tp-group:not(.active){opacity:.45}
.tp-pills{display:flex;flex-wrap:wrap;gap:7px}
.tech-pill{display:inline-flex;align-items:center;gap:7px;background:var(--raised);color:var(--fg-3);border:1px solid var(--raised-2);border-radius:999px;padding:4px 12px 4px 9px;font-size:12.5px;cursor:pointer;user-select:none}
.tech-pill:hover{border-color:var(--line-2)}
.tech-pill.active{color:var(--fg)}
.tech-pill:not(.active){opacity:.4}
.tech-pill:not(.active) .tp-swatch{filter:grayscale(1)}
.tp-swatch{width:9px;height:9px;border-radius:50%;display:inline-block}
.tp-line{width:3px;height:15px;border-radius:2px;display:inline-block;flex:none;align-self:center}
.prose-tech{white-space:nowrap}
.study .prose-tech{font-weight:600;color:var(--fg)}
.prose-tech .tech-logo{width:13px;height:13px;vertical-align:-2px;margin-right:3px}
[data-measure].measure-off{display:none}
.case{margin:0 0 48px;border:1px solid var(--line);border-radius:12px;padding:4px 22px 18px;background:var(--panel)}
.case>summary{list-style:none;cursor:pointer;padding:18px 0 6px;display:flex;align-items:baseline;gap:11px;flex-wrap:wrap}
.case>summary::-webkit-details-marker{display:none}
.case-title{font-size:28px;font-weight:700;letter-spacing:-.01em}
.case-sub{color:var(--muted);font-size:14px}
.chip{font:11.5px/1 ui-monospace,monospace;color:var(--muted);background:var(--raised);border:1px solid var(--raised-2);border-radius:6px;padding:4px 8px}
.case-desc{color:var(--muted);margin:0 0 12px;max-width:64ch;font-size:14px;line-height:1.55}
.chart-title{font-size:17px;line-height:1.3;color:var(--fg);margin:0;font-weight:650}
/* Chart heading row: name + caption on the left, the tool mark or banner on the right. */
.ch-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 14px}
.ch-text{min-width:0}
.ch-cap{margin:4px 0 0;font-size:13px;color:var(--muted);max-width:80ch}
/* Space between sections (88px) is several times the largest space inside one, so each
   heading reads as the start of its own chart. */
.case [data-measure]{margin-top:88px}
.case [data-group]{padding-top:32px;border-top:1px solid var(--line);margin-top:96px}
.case [data-group]::before{content:attr(data-group);display:block;margin:0 0 14px;padding-left:28px;line-height:20px;background:no-repeat left center/20px 20px;font-size:12px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-3)}
/* Group labels repeat the header pipeline icons (HeadPipeline) so the page sections map to the three cards. */
.case [data-group="Server"]::before{background-image:url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2358a6ff%22 stroke-width=%221.6%22%3E%3Crect x=%223%22 y=%224%22 width=%2218%22 height=%227%22 rx=%222%22/%3E%3Crect x=%223%22 y=%2213%22 width=%2218%22 height=%227%22 rx=%222%22/%3E%3Ccircle cx=%227%22 cy=%227.5%22 r=%22.9%22 fill=%22%2358a6ff%22/%3E%3Ccircle cx=%227%22 cy=%2216.5%22 r=%22.9%22 fill=%22%2358a6ff%22/%3E%3C/svg%3E")}
.case [data-group="Network"]::before{background-image:url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%233fb950%22 stroke-width=%221.6%22%3E%3Cpath d=%22M4 8h13l-3-3M20 16H7l3 3%22/%3E%3C/svg%3E")}
.case [data-group="Browser"]::before{background-image:url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23bc8cff%22 stroke-width=%221.6%22%3E%3Crect x=%223%22 y=%224%22 width=%2218%22 height=%2216%22 rx=%222%22/%3E%3Cpath d=%22M3 9h18%22/%3E%3Ccircle cx=%226%22 cy=%226.5%22 r=%22.7%22 fill=%22%23bc8cff%22/%3E%3Ccircle cx=%228.5%22 cy=%226.5%22 r=%22.7%22 fill=%22%23bc8cff%22/%3E%3C/svg%3E")}
.case [data-measure="code"]{margin-top:28px}
.case [data-measure="code"] .chart-title{margin:0 0 12px}
.case-analysis{margin:0 0 16px}
.sum-headline{margin:0 0 10px;color:var(--fg);font-size:15px;line-height:1.5;max-width:64ch}
.case-analysis .sum-headline{margin:0}
.sum-stale{margin-left:10px;padding:2px 7px;border:1px solid #9e6a03;border-radius:999px;color:#d29922;font-size:11px;white-space:nowrap}
.sum-winner{display:inline-flex;align-items:center;gap:6px;color:var(--fg);font-size:13px;font-weight:600;flex:0 0 auto}
.sum-why{margin:4px 0;color:var(--fg-3);font-size:13px;max-width:64ch}
.study{border:1px solid var(--line);border-radius:12px;padding:18px 20px;background:var(--panel);margin-bottom:24px}
.study-head{display:flex;align-items:baseline;gap:12px;margin-bottom:8px}
.study-title{font-size:14px;font-weight:650}
.study-sub{display:block;color:var(--muted-2);text-transform:uppercase;font-size:10.5px;letter-spacing:.06em;margin:12px 0 6px}
.study-finding{margin:10px 0}
.study-finding b{color:var(--fg);font-size:13.5px}
.study-finding .sum-why{margin-left:0}
.study-hint{display:flex;gap:12px;align-items:baseline;padding:3px 0}
.study-hint .sum-winner{flex:0 0 210px}
.study-hint-text{color:var(--fg-3);font-size:13px}
.study-docs{margin:12px 0 0;color:var(--muted);font-size:12.5px}
.study-docs a{color:var(--link)}
.study-foot{margin:14px 0 0;color:var(--muted-2);font-size:11px}
@media screen and (max-width:767px){.study-hint{flex-direction:column;gap:2px}.study-hint .sum-winner{flex:none}}
.sum-cross{margin:8px 0 0;color:var(--muted);font-size:13px;max-width:64ch}
.study .sum-cross{padding-top:8px;border-top:1px dashed var(--line-2)}
.info{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:7px;border:1px solid var(--line-2);border-radius:50%;font:italic 700 9px/1 Georgia,serif;color:var(--muted);cursor:help;position:relative;text-transform:none;letter-spacing:0;vertical-align:middle}
.info:hover{color:var(--fg-2);border-color:var(--muted-2)}
.hide-measure{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:5px;padding:0;border:1px solid var(--line-2);border-radius:50%;background:none;color:var(--muted);cursor:pointer;position:relative;vertical-align:middle}
.hide-measure svg{display:block}
.hide-measure:hover,.hide-measure:focus-visible{color:var(--fg-2);border-color:var(--muted-2)}
.info .tip,.hide-measure .tip{display:none;position:absolute;bottom:150%;left:50%;transform:translateX(-50%);width:max-content;max-width:330px;background:var(--raised);border:1px solid var(--line-2);border-radius:8px;padding:9px 11px;font:400 12px/1.55 -apple-system,system-ui,sans-serif;color:var(--fg-2);text-transform:none;letter-spacing:0;z-index:30;box-shadow:0 8px 24px rgba(0,0,0,.55);white-space:normal;text-align:left}
.tip .tip-p{display:block;margin-top:7px}
.tip .tip-src{color:var(--muted)}
.info:hover .tip,.info:focus .tip,.hide-measure:hover .tip,.hide-measure:focus-visible .tip{display:block}
.bars,.attr{display:grid;grid-template-columns:200px 1fr minmax(56px,max-content);column-gap:14px;row-gap:0;align-items:center}
.bars{margin-bottom:8px}
/* Rows touch (padding, not row-gap) so the pointer never crosses a dead zone between bars. */
.bar-row{display:grid;grid-template-columns:subgrid;grid-column:1/-1;align-items:center;padding:4.5px 0}
.bar-row.tech-off{display:none}
.bar-label{display:flex;align-items:center;justify-content:flex-start;gap:7px;min-width:0;color:var(--fg-2);font-size:13px}
.bar-label .tl-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.tech-logo{width:14px;height:14px;object-fit:contain;vertical-align:-2px;border-radius:3px;flex:none}
.tech-pill .tech-logo{width:13px;height:13px}
.ed-file .tech-logo,.lc-legend .tech-logo{margin-right:5px}
.bar-track{background:var(--raised);border-radius:5px;height:16px;overflow:hidden}
.bar-fill{display:block;height:100%;border-radius:5px}
.bar-val{font-variant-numeric:tabular-nums;font-size:13px;text-align:right;white-space:nowrap}
.bar-best{font-weight:700;color:#3fb950}
/* The measuring tool's logo with its author's avatar, at the start of a chart title. The logo is
   dark grey on transparent, so it sits on a white tile in both themes. */
.tool-mark{display:flex;flex:none;align-items:center;gap:8px;height:30px;padding:0 6px 0 10px;border:1px solid var(--line-2);border-radius:6px;background:var(--raised);font-size:13px;font-weight:600;color:var(--fg-2);text-decoration:none}
.tool-mark:hover{color:var(--fg)}
.tool-mark{position:relative}
.tool-mark .tip{display:none;position:absolute;top:calc(100% + 8px);right:0;width:max-content;max-width:300px;background:var(--raised);border:1px solid var(--line-2);border-radius:8px;padding:9px 11px;font:400 12px/1.55 -apple-system,system-ui,sans-serif;color:var(--fg-2);z-index:30;box-shadow:0 8px 24px rgba(0,0,0,.55);white-space:normal;text-align:left}
.tool-mark:hover .tip,.tool-mark:focus-visible .tip{display:block}
.tm-word{font:500 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.02em;color:var(--fg-2)}
.tm-word b{color:#f0b429;font-weight:700}
.tm-logo{width:18px;height:18px;padding:2px;box-sizing:border-box;border-radius:4px;background:#fff}
.tm-av{width:18px;height:18px;border-radius:50%}
.pd-donut{display:block;flex:none}
.pd-center{font:700 13px -apple-system,system-ui,sans-serif;fill:var(--fg)}
@media print{.prof-diff{display:none}}
/* Two measures on shared rows: labels and the first measure on the left, the second measure
   (bars only) on the right. Both charts render the same lanes in the same order. */
/* Label column, then two equal halves: the left half holds the first measure's track and
   value, the right half the second's, so both tracks get the same width. */
.pair{display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,1fr);column-gap:14px;align-items:start}
.pair-col{display:contents}
.pair-col>*{grid-column:1/3;min-width:0;padding-right:24px}
.pair-r>*,.pair .pair-r>.pair-legend{grid-column:3;padding:0 0 0 24px}
.pair-head{grid-row:1;display:flex;align-items:center;height:22px;margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--fg-2)}
.pair-col:first-child>.pair-head{padding-left:214px}
/* The profile legend sits under its bars, so both columns start their rows right under the heads. */
.pair .pair-legend{grid-row:3}
.pair .attr-legend.pair-legend{margin:8px 0 0}
.attr-legend.pair-legend{margin:0 0 6px;font-size:11.5px;gap:4px 10px;align-content:flex-start}
.pair-col>.bars,.pair-col>.attr{grid-row:2}
.pair .bars,.pair .attr{grid-template-columns:200px 1fr 72px}
.pair-r .bars,.pair-r .attr{grid-template-columns:1fr 72px}
.pair-r .bar-row>.bar-label{display:none}
/* The comparison sentence shares the legend's row: left under the timing bars, legend on the right. */
.pair .prof-diff{grid-row:3;grid-column:1/3;padding:0 24px 0 0;margin:10px 0 0}
.rt>.pair-legend{margin-bottom:12px}
.bar-empty .bar-track{visibility:hidden}
.bar-empty .bar-val{color:var(--muted-2)}
.prof{margin-top:24px}
.prof-title{margin:0;font-size:15px;font-weight:650;color:var(--fg)}
.prof>.ch-cap{margin-bottom:12px}
.prof-diff{margin:0 0 12px;font-size:13px;line-height:1.5;color:var(--muted);max-width:72ch}
/* A small picture above a chart title that shows what the chart is about. */
.chart-banner{display:block;flex:none;width:180px;height:auto;border-radius:6px;border:1px solid var(--line-2)}
/* Bar hover card: the hovered (or, on touch screens, tapped) row's track becomes the anchor and
   the card sits above it. position:fixed escapes the track's overflow:hidden. Browsers without
   anchor positioning show no card. */
.bar-tip{display:none}
@supports (anchor-name:--a){
  .bar-row[tabindex]{outline:none}
  .bar-tip{position:fixed;position-anchor:--bar-tip;position-area:top;position-try-fallbacks:flip-block;margin:6px 0;grid-template-columns:auto auto;gap:3px 14px;align-items:baseline;width:max-content;max-width:calc(100vw - 24px);background:var(--raised);border:1px solid var(--line-2);border-radius:8px;padding:9px 11px;font:400 12px/1.4 -apple-system,system-ui,sans-serif;color:var(--fg-2);box-shadow:0 8px 24px rgba(0,0,0,.55);z-index:30;pointer-events:none}
  .bt-title{grid-column:1/-1;display:flex;align-items:center;gap:6px;font-weight:600;color:var(--fg);margin-bottom:3px}
  .bt-visual{grid-column:1/-1;display:flex;justify-content:center;margin:2px 0 6px}
  .bt-key{display:flex;align-items:center;gap:6px;color:var(--muted);white-space:nowrap}
  .bt-key i{width:9px;height:9px;border-radius:2px;flex:none}
  .bt-val{text-align:right;font-variant-numeric:tabular-nums}
  .bt-note{grid-column:1/-1;margin-top:4px;padding-top:5px;border-top:1px solid var(--line-2);color:var(--muted)}
  /* Hover intent: the first card in a chart rises in from its bottom edge (the side facing the
     pointer) after a short rest; once one has shown, the chart is "warm" (.tip-warm, set by the
     controller) and cards switch rows at once. The controller also moves a 1px anchor
     (.bar-ptr) to the pointer's x, so the card sits 8px above the row right over the pointer;
     without JS the card centres on the track. Leaving fades the card out in 100ms. */
  @media (hover:hover){
    .bar-row{position:relative}
    .bar-ptr{position:absolute;inset-block:0;width:1px;pointer-events:none;anchor-name:--bar-tip}
    /* The card belongs to the bar: only the track opens it. A transparent border fills the row
       height so the pointer never falls between two tracks. */
    /* Corners 5px wide and 11.5px tall on the border box, so the visible part (inside the 6.5px top and
       bottom border) has round 5px corners. */
    .bar-track{height:29px;border-block:6.5px solid transparent;margin-block:-4.5px;background-clip:padding-box;border-radius:5px/11.5px}
    .bar-row:has(>.bar-track:hover)>.bar-track{anchor-name:--bar-tip}
    .bar-row:has(>.bar-ptr)>.bar-track{anchor-name:none}
    .bar-tip{margin:8px 0;opacity:0;transform-origin:50% 100%;transition:opacity .1s ease-in,display .1s allow-discrete}
    .bar-row:has(>.bar-track:hover)>.bar-tip{display:grid;opacity:1;scale:1;translate:0;transition:opacity .15s cubic-bezier(.16,1,.3,1) .32s,scale .15s cubic-bezier(.16,1,.3,1) .32s,translate .15s cubic-bezier(.16,1,.3,1) .32s,display 0s allow-discrete}
    @starting-style{.bar-row:has(>.bar-track:hover)>.bar-tip{opacity:0;scale:.97;translate:0 4px}}
    /* Warm and still over the chart: switch rows without fades; leaving the chart still fades out. */
    .tip-warm:has(.bar-track:hover) .bar-tip{transition:none}
    .bar-track:hover{box-shadow:inset 0 0 0 1px var(--line-2)}
  }
  @media (hover:hover) and (prefers-reduced-motion:reduce){
    @starting-style{.bar-row:has(>.bar-track:hover)>.bar-tip{scale:1;translate:0}}
  }
  /* Escape hides the card until the pointer moves again (WCAG 1.4.13, dismissible). */
  .tip-off .bar-tip{display:none!important}
  @media (hover:none){
    .bar-row:focus>.bar-track{anchor-name:--bar-tip}
    .bar-row:focus>.bar-tip{display:grid}
  }
}
.bar-unit,.bar-spread{color:var(--muted);font-size:11px}
.bar-breakdown{margin-left:8px;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.bar-breakdown .bd-sep{color:var(--muted-2)}
.attr .bar-track{display:flex}
.attr-seg{display:block;height:100%}
.attr-seg:first-child{border-radius:5px 0 0 5px}
.attr-seg:last-child{border-radius:0 5px 5px 0}
.attr-seg:only-child{border-radius:5px}
.attr-legend{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:14px;margin-bottom:3px;font-size:12px;color:var(--muted)}
.attr-legend:not(.pair-legend){margin-bottom:10px}
/* Value scale (Axis.tsx): faint gridlines at round values between the track and the coloured
   fills, and a ruler under the last row with a short tick and a label per value. The scale ends
   on a tick; the line at the end is left out so the rounded track ends stand free. */
.ax{position:relative;padding-bottom:26px}
.axis{position:absolute;grid-column:2/3;top:0;bottom:22px;left:0;right:0;pointer-events:none;z-index:1;border-bottom:1px solid var(--line-2)}
.pair-r .axis{grid-column:1/2}
.axis i{position:absolute;top:0;bottom:0;left:calc(var(--p)*(100% - 1px));width:1px;background:rgba(139,148,158,.17)}
.axis i:last-child{background:none}
.axis i::after{content:"";position:absolute;left:0;bottom:-5px;width:1px;height:4px;background:var(--line-2)}
.axis b{position:absolute;top:calc(100% + 9px);left:50%;transform:translateX(-50%);font:400 10.5px/1 system-ui,sans-serif;color:var(--muted-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.axis b u{text-decoration:none;position:absolute;left:100%;margin-left:3px}
.ax .bar-fill,.ax .attr-seg{position:relative;z-index:2}
.attr-legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.rt .bar-label{display:flex;gap:7px;justify-content:flex-start;align-items:center}
.rt-lane{display:flex;align-items:center;gap:6px;min-width:0;color:var(--fg-2)}
.rt-eng{color:var(--muted-2);font-size:11px;flex:none}
.rt-badge{margin-left:8px;padding:1px 6px;border:1px solid var(--line-2);border-radius:999px;font-size:11px;color:var(--fg-3);font-variant-numeric:tabular-nums}
.rt-note{grid-column:1/-1;margin:10px 0 0;font-size:12px;line-height:1.5;color:var(--muted);max-width:64ch}
.rt-badge{margin-left:6px}
.wpd-breakdown{margin-top:8px}
.pair .wpd-breakdown{margin-top:0}
.lchart svg{width:100%;max-width:760px;height:auto}
.lc-axis{fill:var(--muted);font-size:10px}
.lc-line{stroke-width:1.5;fill:none}
.lc-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;font-size:12px;color:var(--fg-3)}
.lc-legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.lc-legend span.tech-off,.lc-line.tech-off,.lc-dot.tech-off{display:none}
.editor{display:flex;border:1px solid var(--raised-2);border-radius:8px;overflow:hidden;margin-bottom:8px;background:var(--panel)}
.ed-side{flex:0 0 200px;border-right:1px solid var(--raised-2);padding:6px 0;overflow:auto}
.ed-file{display:block;width:100%;text-align:left;background:none;border:0;color:var(--muted);padding:5px 12px;font:12.5px/1.3 system-ui,sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-file:hover{background:var(--raised);color:var(--fg-2)}
.ed-file.active{background:var(--raised-2);color:var(--fg)}
.ed-file.tech-off{display:none}
.ed-file-off{text-decoration:line-through;color:var(--muted-2)}
.ed-file-off.active{color:var(--fg-3)}
.ed-main{flex:1;min-width:0;display:flex;flex-direction:column;position:relative;overflow:hidden}
/* One tab row per lane is rendered; CSS shows the active one. Without JS no row is marked
   active, so the first lane's row stays visible and the editor still works. */
.ed-tabs{display:none;gap:10px;background:var(--panel);border-bottom:1px solid var(--raised-2);overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.ed-tabs::-webkit-scrollbar{display:none}
.ed-tabs-first{display:flex}
.editor.ed-js .ed-tabs-first:not(.active){display:none}
.editor.ed-js .ed-tabs.active{display:flex}
/* Each group is its own bar; the gap between bars does the grouping, so the row keeps a
   single line weight — thin separators inside a bar, nothing between them. */
.ed-group{display:flex;background:var(--panel-2)}
.ed-group .ed-tab:last-child{border-right:0}
.ed-gen::before{content:"→ ";color:var(--muted-2)}
.ed-tab{background:none;border:0;border-right:1px solid var(--raised-2);color:var(--muted);padding:8px 16px;font:12.5px/1 ui-monospace,monospace;cursor:pointer;white-space:nowrap}
.ed-tab:hover{color:var(--fg-2)}
.ed-tab.active{background:var(--panel);color:var(--fg)}
/* The active tab's underline is one element per editor, anchored to the active tab, so it
   slides when the tab changes — also across the row swap of a lane click, since it sits on
   .ed-main rather than on the row. Only the active row is laid out, so its active tab is
   the only anchor in reach. Without JS no tab is active, hence no underline to draw. */
@supports (anchor-name:--a){
  .ed-tab.active{anchor-name:--ed-tab}
  .editor.ed-js .ed-main::after{content:"";position:absolute;position-anchor:--ed-tab;bottom:anchor(bottom);left:anchor(left);right:anchor(right);height:2px;background:#1f6feb;pointer-events:none;transition:left .22s cubic-bezier(.2,.7,.2,1),right .22s cubic-bezier(.2,.7,.2,1)}
  @media (prefers-reduced-motion:reduce){.editor.ed-js .ed-main::after{transition:none}}
}
@supports not (anchor-name:--a){
  .ed-tab.active{box-shadow:inset 0 -2px 0 #1f6feb}
}
.ed-frame{width:100%;height:420px;border:0;background:var(--panel)}
.ed-shot{display:none;width:100%;height:420px;object-fit:contain;object-position:center;background:#fff;box-sizing:border-box;padding:16px}
.editor.ed-show-shot .ed-frame{display:none}
.editor.ed-show-shot .ed-shot{display:block}
/* a struck-through lane's not-compatible.md, shown in the body in place of the frame */
.ed-note{display:none;height:420px;overflow:auto;box-sizing:border-box;padding:18px 22px;font-size:13.5px;line-height:1.55;color:var(--fg-2)}
.ed-note p,.ed-note ul,.ed-note blockquote{max-width:72ch;margin:0 0 12px}
.ed-note blockquote{padding:6px 14px;border-left:3px solid var(--raised-2);color:var(--fg)}
.ed-note a{color:var(--link)}
.editor.ed-show-note .ed-frame{display:none}
.editor.ed-show-note .ed-note.active{display:block}
.buildtime{border:1px solid var(--line);border-radius:12px;padding:6px 22px 18px;background:var(--panel);margin-top:24px}
.bd-kind{color:var(--fg-3)}
.outro{border:1px solid var(--line);border-radius:12px;padding:6px 20px 16px;background:var(--panel);margin-top:24px}
.outro-tools{margin:0;padding-left:18px;color:var(--fg-3);font-size:13px}
.outro-tools li{margin:6px 0;max-width:64ch}
.outro-tools b{color:var(--fg)}
.outro-run{color:var(--muted);font-size:13px;margin:12px 0 0;max-width:100ch}
.outro a{color:var(--link)}
.page-foot{color:var(--muted-2);font-size:12px;max-width:1000px;margin:0 auto;padding:8px 24px}
code{background:var(--raised);padding:1px 5px;border-radius:4px;font-size:12px}
.mono{font-family:ui-monospace,monospace;font-size:.92em}
code.mono{background:none;padding:0;border-radius:0;color:var(--fg-2)}
a.mono{color:var(--link);text-decoration:none;background:none;padding:0}
a.mono:hover{text-decoration:underline}
@media screen and (max-width:767px){
  .wrap{padding-inline:12px}
  .head-inner{padding-inline:12px}
  .filter-panel{padding-inline:14px}
  /* No room for a 150px label column beside the pills: stack the label above them. */
  .tp-row{flex-direction:column;align-items:stretch;gap:6px;padding:8px 0}
  .tp-group{flex:none}
  .case{padding:4px 14px 16px}
  .bars,.attr{display:flex;flex-direction:column;gap:7px;align-items:stretch}
  .bar-row{grid-column:auto;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:4px 8px}
  .bar-label{grid-column:1;grid-row:1;min-width:0;justify-content:flex-start;flex-wrap:wrap;line-height:1.35}
  .bar-label .tl-text{white-space:normal;overflow:visible}
  .bar-track{grid-column:1/-1;grid-row:2;width:100%;height:10px;border-block:0;margin-block:0;border-radius:5px}
  /* Bars sit under their labels here, so only the ruler stays; its end labels align to the edges. */
  .axis i{background:none}
  .axis i:first-child b{left:0;transform:none}
  .axis i:last-child b{left:auto;right:0;transform:none}
  .axis i:last-child b u{position:static;margin-left:3px}
  .bar-val{grid-column:2;grid-row:1;min-width:0;text-align:right;line-height:1.35;white-space:nowrap}
  .bar-breakdown{display:block;margin-left:0;font-size:10.5px}
  .rt .bar-label{justify-content:flex-start}
  .rt .bar-val{min-width:0}
  .ch-head{flex-wrap:wrap}
  .pair{display:block}
  .pair-col{display:flex;flex-direction:column;margin-bottom:18px}
  .pair-col>*,.pair-r>*,.pair .pair-r>.pair-legend{padding:0}
  .pair-col>.ax{padding-bottom:26px}
  .pair-col:first-child>.pair-head{padding-left:0}
  .pair-r>.pair-legend{order:1}
  .pair-r .bar-row>.bar-label{display:flex}
  .chart-banner{width:160px}
  .editor{display:block}
  .ed-side{display:flex;width:100%;padding:0;border-right:0;border-bottom:1px solid var(--raised-2);overflow-x:auto}
  .ed-file{flex:0 0 auto;width:auto;padding:9px 12px}
  .ed-main{width:100%}
  .ed-frame,.ed-shot,.ed-note{height:min(440px,65vh)}
  .ed-shot{padding:8px}
  .info .tip,.hide-measure .tip{position:fixed;left:12px;right:12px;bottom:12px;width:auto;max-width:none;transform:none}
  .page-foot{padding-inline:12px}
}
/* Print: the light palette is the token block above, re-valued; everything a reader can
   click carries data-screen-only and is dropped. Colored marks keep their ink. */
@media print{
  :root{--bg:#fff;--panel:#fff;--panel-2:#f6f8fa;--raised:#f6f8fa;--raised-2:#e7ecf0;--line:#d0d7de;--line-2:#d0d7de;--fg:#1f2328;--fg-2:#24292f;--fg-3:#424a53;--muted:#57606a;--muted-2:#6e7781;--link:#0969da}
  [data-screen-only]{display:none!important}
  body{padding:0}
  .wrap,.head-inner{max-width:none;padding:0 8mm}
  .case+.case{break-before:page}
  .case>summary{cursor:default}
  .chart-title{break-after:avoid}
  .bars,.attr,.lchart,.study{break-inside:avoid}
  .bar-track,.bar-fill,.attr-seg,.tp-swatch,.attr-legend i,.lc-legend i,.brand-dot{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  a{color:inherit}
}
`;

const MEASURE_GROUPS: { group: string; items: [string, string][] }[] = [
  {
    group: "Server",
    items: [
      ["microbench", "Throughput"],
      ["autocannon", "Load req/s"],
      ["attribution", "CPU split"],
      ["nsweep", "Scaling"],
    ],
  },
  {
    group: "Browser",
    items: [
      ["hydrate", "Hydration"],
      ["inp", "Interaction"],
      ["mount", "Cold mount"],
      ["render-timing", "Paint/Layout"],
    ],
  },
  {
    group: "Size & build",
    items: [
      ["payload", "Page bytes"],
      ["buildtime", "Build time"],
    ],
  },
];
const MEASURE_COUNT = MEASURE_GROUPS.reduce((n, g) => n + g.items.length, 0);
const MEASURE_LABEL: Record<string, string> = Object.fromEntries(MEASURE_GROUPS.flatMap((g) => g.items));

// A × on every chart title, so a measurement can be dropped from where it is read without
// scrolling back to the filter panel. It drives the same control the panel does.
/** The folded page corner that links to the repository (desktop). Static SVG markup, inserted as is. */
const GH_CORNER_SVG = '<svg viewBox="4.5 28.5 310 310" aria-hidden="true">\n    <defs>\n      <path id="gh-fold" d="M22.5 28.5C43.5 30.5 64.5 41.5 88 62.5C149 115.5 209.8 169.5 266 222.5C291.3 245 308.6 265 314.5 287"/>\n      <path id="gh-flap" d="M22.5 28.5C43.5 30.5 64.5 41.5 88 62.5C149 115.5 209.8 169.5 266 222.5C291.3 245 308.6 265 314.5 287V300C313.5 295 311.5 289 309.4 282.5C304 261 284 254.6 258.4 250.5C230 246 170 239.2 140.4 234.5C110.4 228.5 87.9 209 82.8 182.5L53.8 62.5C49.4 45 36.4 35 22.5 28.5Z"/>\n      <path id="gh-light" d="M22.5 28.5C43.5 30.5 64.5 41.5 88 62.5C149 115.5 209.8 169.5 266 222.5C291.3 245 308.6 265 314.5 287V28.5Z"/>\n      <path id="gh-under" d="M22.5 28.5C43.5 30.5 64.5 41.5 88 62.5C149 115.5 209.8 169.5 266 222.5C291.3 245 308.6 265 314.5 287L330 340V420H-120V28.5Z"/>\n      <clipPath id="gh-flap-clip"><use href="#gh-flap"/></clipPath>\n      <clipPath id="gh-light-clip"><use href="#gh-light"/></clipPath>\n      <radialGradient id="gh-light-tip" gradientUnits="userSpaceOnUse" cx="314.5" cy="287" r="55">\n        <stop offset="0" stop-color="#1b222b" stop-opacity=".16"/>\n        <stop offset="1" stop-color="#1b222b" stop-opacity="0"/>\n      </radialGradient>\n      <linearGradient id="gh-flap-fill" gradientUnits="userSpaceOnUse" x1="180" y1="143.5" x2="126.5" y2="203">\n        <stop offset="0" stop-color="#2f3741"/>\n        <stop offset=".3" stop-color="#2e3640"/>\n        <stop offset="1" stop-color="#2d353f"/>\n      </linearGradient>\n      <linearGradient id="gh-fold-glow" gradientUnits="userSpaceOnUse" x1="22" y1="28.5" x2="170" y2="135">\n        <stop offset="0" stop-color="#465060" stop-opacity=".7"/>\n        <stop offset=".3" stop-color="#465060" stop-opacity=".3"/>\n        <stop offset="1" stop-color="#465060" stop-opacity=".1"/>\n      </linearGradient>\n      <linearGradient id="gh-fold-line" gradientUnits="userSpaceOnUse" x1="22" y1="28.5" x2="120" y2="92">\n        <stop offset="0" stop-color="#465060" stop-opacity=".6"/>\n        <stop offset=".45" stop-color="#465060" stop-opacity=".5"/>\n        <stop offset="1" stop-color="#465060" stop-opacity="0"/>\n      </linearGradient>\n      <linearGradient id="gh-fold-light" gradientUnits="userSpaceOnUse" x1="22" y1="28.5" x2="110" y2="85">\n        <stop offset="0" stop-color="#f7f9fc"/>\n        <stop offset=".3" stop-color="#eef1f5" stop-opacity=".8"/>\n        <stop offset="1" stop-color="#e6e9ee" stop-opacity=".4"/>\n      </linearGradient>\n      <radialGradient id="gh-flap-bend" gradientUnits="userSpaceOnUse" cx="292" cy="252" r="16">\n        <stop offset="0" stop-color="#3b434e" stop-opacity=".7"/>\n        <stop offset="1" stop-color="#3b434e" stop-opacity="0"/>\n      </radialGradient>\n      <radialGradient id="gh-flap-top" gradientUnits="userSpaceOnUse" cx="22.5" cy="28.5" r="35">\n        <stop offset="0" stop-color="#3b434e"/>\n        <stop offset=".6" stop-color="#3b434e" stop-opacity=".8"/>\n        <stop offset="1" stop-color="#3b434e" stop-opacity="0"/>\n      </radialGradient>\n      <radialGradient id="gh-flap-tip" gradientUnits="userSpaceOnUse" cx="314.5" cy="290" r="45">\n        <stop offset="0" stop-color="#0d1117" stop-opacity=".45"/>\n        <stop offset="1" stop-color="#0d1117" stop-opacity="0"/>\n      </radialGradient>\n      <filter id="gh-blur-22" filterUnits="userSpaceOnUse" x="-120" y="-80" width="560" height="560"><feGaussianBlur stdDeviation="22"/></filter>\n      <filter id="gh-blur-16" filterUnits="userSpaceOnUse" x="-120" y="-80" width="560" height="560"><feGaussianBlur stdDeviation="16"/></filter>\n      <filter id="gh-blur-6" filterUnits="userSpaceOnUse" x="-120" y="-80" width="560" height="560"><feGaussianBlur stdDeviation="6"/></filter>\n      <filter id="gh-blur-3" filterUnits="userSpaceOnUse" x="-120" y="-80" width="560" height="560"><feGaussianBlur stdDeviation="3"/></filter>\n    </defs>\n    <g class="gh-curl"><use href="#gh-flap" transform="translate(12 25)" fill="#000" opacity=".8" filter="url(#gh-blur-22)"/>\n    <use href="#gh-flap" transform="translate(-3 2)" fill="#000" opacity=".35" filter="url(#gh-blur-6)"/>\n    <use href="#gh-light" fill="#f3f6fb"/>\n    <g clip-path="url(#gh-light-clip)">\n      <use href="#gh-under" fill="#2b323c" opacity=".36" filter="url(#gh-blur-16)"/>\n      <use href="#gh-light" fill="url(#gh-light-tip)"/>\n      <use href="#gh-fold" fill="none" stroke="url(#gh-fold-light)" stroke-width="5"/>\n    </g>\n    </g><path transform="translate(190.7 54.4) scale(6.3125)" fill="#12161c" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>\n    <g class="gh-curl"><use href="#gh-flap" fill="url(#gh-flap-fill)"/>\n    <g clip-path="url(#gh-flap-clip)">\n      <use href="#gh-flap" fill="none" stroke="#3a434e" stroke-opacity=".55" stroke-width="2.4"/>\n      <use href="#gh-flap" fill="url(#gh-flap-bend)"/>\n      <use href="#gh-fold" fill="none" stroke="url(#gh-fold-glow)" stroke-width="7" filter="url(#gh-blur-3)"/>\n      <use href="#gh-fold" fill="none" stroke="url(#gh-fold-line)" stroke-width="3.4"/>\n      <use href="#gh-flap" fill="url(#gh-flap-top)"/>\n      <use href="#gh-flap" fill="url(#gh-flap-tip)"/>\n    </g>\n    <use href="#gh-fold" fill="none" stroke="#252d3a" stroke-width="1.1"/>\n    <text transform="translate(161.4 174.1) rotate(42)" x=".6" y="14.7" text-anchor="middle">GitHub</text>\n  </g></svg>';

/** The header's three places where styling costs something, in the order a page travels. */
function HeadPipeline() {
  const stages = [
    { name: "Server", color: "#58a6ff", icon: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><circle cx="7" cy="7.5" r=".9" fill="currentColor" /><circle cx="7" cy="16.5" r=".9" fill="currentColor" /></>, chips: ["render throughput", "under load", "render split", "scaling"] },
    { name: "Network", color: "#3fb950", icon: <path d="M4 8h13l-3-3M20 16H7l3 3" />, chips: ["JS bytes", "CSS bytes", "HTML bytes"] },
    { name: "Browser", color: "#bc8cff", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><circle cx="6" cy="6.5" r=".7" fill="currentColor" /><circle cx="8.5" cy="6.5" r=".7" fill="currentColor" /></>, chips: ["hydration", "updates", "cold mount", "style & layout"] },
  ];
  return (
    <div className="hp">
      {stages.map((st, i) => (
        <React.Fragment key={st.name}>
          {i > 0 ? <span className="hp-arrow" aria-hidden="true">→</span> : null}
          <div className="hp-stage">
            <div className="hp-name" style={{ color: st.color }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{st.icon}</svg>
              <span>{st.name}</span>
            </div>
            <div className="hp-chips">{st.chips.map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function HideMeasure({ k }: { k: string }) {
  const label = k === "code" ? "source and preview" : MEASURE_LABEL[k];
  return (
    <button type="button" className="hide-measure" data-measure-hide={k} data-screen-only aria-label={`Hide ${label} in this report`}>
      <svg viewBox="0 0 8 8" width="7" height="7" aria-hidden="true">
        <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="tip">Hide {label} in this report</span>
    </button>
  );
}

const CONTROLLER = `
// ---- code editor ------------------------------------------------------------------
// One editor per case. Its state is { lane, art, chosen }: the lane shown in the sidebar,
// the tab (data-art) open for it, and whether the reader has clicked a tab in THIS editor.
// The editor opens on the preview. Until the reader picks a tab, a lane click opens that
// lane's first code file instead of keeping the preview: every lane renders the same
// image, so a fresh reader clicking through lanes would otherwise see nothing change and
// never learn that the tabs hold the source and the generated output. Once a tab was
// chosen, lane clicks keep it. A struck-through lane (data-missing) has one tab, its
// not-compatible.md, rendered inline as .ed-note; the state machine needs no special case
// for it since carry() falls back to the lane's first tab in both directions.
function mountEditor(ed) {
  ed.classList.add('ed-js');
  const frame = ed.querySelector('.ed-frame');
  const shot = ed.querySelector('.ed-shot');
  const files = [...ed.querySelectorAll('.ed-file')];
  const rows = [...ed.querySelectorAll('.ed-tabs')];
  const state = { lane: ed.dataset.lane, art: ed.dataset.art, chosen: false };

  const tabsOf = (lane) => [...rows.find(r => r.dataset.tabsLane===lane).querySelectorAll('.ed-tab')];
  const firstCode = (lane) => tabsOf(lane).find(t => t.dataset.art!=='preview').dataset.art;
  // Carry the open tab to another lane. File names differ by extension across lanes
  // (@yak/react text.tsx vs StyleX text.ts), so a missing name falls back to the same stem;
  // anything still unmatched (a lane without a preview image, say) opens the entry file.
  const carry = (art, lane) => {
    const tabs = tabsOf(lane);
    if (tabs.some(t => t.dataset.art===art)) return art;
    const stem = ed.querySelector('.ed-tab[data-art="'+art+'"]')?.dataset.stem;
    return tabs.find(t => stem && t.dataset.stem===stem)?.dataset.art || firstCode(lane);
  };

  const render = () => {
    for (const b of files) b.classList.toggle('active', b.dataset.lane===state.lane);
    // every lane's tab row is in the DOM; show only the active lane's
    for (const r of rows) r.classList.toggle('active', r.dataset.tabsLane===state.lane);
    for (const t of ed.querySelectorAll('.ed-tab')) t.classList.toggle('active', t.dataset.art===state.art);
    const preview = state.art==='preview';
    const note = state.art==='note';
    ed.classList.toggle('ed-show-shot', preview);
    ed.classList.toggle('ed-show-note', note);
    for (const n of ed.querySelectorAll('.ed-note')) n.classList.toggle('active', note && n.dataset.noteLane===state.lane);
    if (note) {
      // nothing to load: the note is already in the DOM
    } else if (preview) {
      // every lane renders identically, so the image rarely changes — the highlighted lane
      // name in the sidebar is what signals which lane's render you're viewing.
      const src = files.find(b => b.dataset.lane===state.lane)?.dataset.preview || '';
      if (shot.getAttribute('src')!==src) shot.setAttribute('src', src);
    } else {
      const src = 'assets/code/'+ed.dataset.case+'__'+state.lane+'__'+state.art+'.html';
      if (frame.getAttribute('src')!==src) frame.setAttribute('src', src);
    }
  };
  // byReader: a click in the sidebar. The tech filter also moves an editor off a hidden
  // lane, and that is not the reader exploring the editor, so it keeps the open tab.
  const selectLane = (lane, byReader) => {
    state.art = byReader && !state.chosen ? firstCode(lane) : carry(state.art, lane);
    state.lane = lane;
    render();
  };
  const selectTab = (art) => { state.art = art; state.chosen = true; render(); };

  for (const b of files) b.onclick = () => selectLane(b.dataset.lane, true);
  for (const t of ed.querySelectorAll('.ed-tab')) t.onclick = () => selectTab(t.dataset.art);
  render();
  return {
    // the active lane just got filtered out: move to the first lane still shown,
    // preferring one with a cell over a struck-through one
    leaveHiddenLane() {
      const active = files.find(b => b.dataset.lane===state.lane);
      const shown = files.filter(b => !b.classList.contains('tech-off'));
      const visible = shown.find(b => !b.dataset.missing) || shown[0];
      if (active?.classList.contains('tech-off') && visible) selectLane(visible.dataset.lane, false);
    },
  };
}
const editors = [...document.querySelectorAll('[data-ed]')].map(mountEditor);
// tech pills — toggle one lane across every chart, keep the "N / M shown" count live, and
// if an editor's active lane just got hidden, fall back to its first visible file.
const techPills = [...document.querySelectorAll('[data-tech-filter]')];
const countEl = document.querySelector('[data-tech-count]');
function setTech(b, on) {
  b.classList.toggle('active', on);
  for (const el of document.querySelectorAll('[data-tech="'+b.dataset.techFilter+'"]')) el.classList.toggle('tech-off', !on);
}
// Bar/stack/attribution widths are baked at build time against the max over ALL lanes; when
// some are toggled off, rescale every fill to the max over the VISIBLE rows so the chart uses
// its full width. Each fill carries data-val (its raw number); a row's total is the sum of its
// fills (one for a plain bar, several for a stacked one). The "best" star, if the chart has one,
// moves to the first visible row (rows are pre-sorted best-first).
// Caption under a timing/profile pair: the busiest vs the least busy visible profile row
// (TimingProfilePair.tsx diffText).
function profDiff(rows) {
  const sum = r => Object.values(JSON.parse(r.dataset.slices)).reduce((s, v) => s + v, 0);
  const byActive = [...rows].sort((x, y) => sum(x) - sum(y));
  const least = byActive[0], most = byActive[byActive.length - 1];
  const a = JSON.parse(least.dataset.slices), b = JSON.parse(most.dataset.slices);
  const parts = Object.keys(b).map(k => [k, b[k] - a[k]]).filter(([, d]) => Math.abs(d) >= 0.1)
    .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3)
    .map(([k, d]) => (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' ms ' + (SEG_LABEL[k] || k));
  return most.dataset.label + ' keeps the browser busy ' + (sum(most) - sum(least)).toFixed(1) + ' ms longer than ' + least.dataset.label + ', the least busy' + (parts.length ? ': ' + parts.join(', ') : '');
}
const SEG_LABEL = ${JSON.stringify(Object.fromEntries(SEGMENTS.map(([k, , l]) => [k, l])))};
${niceScale.toString()}
${tickText.toString()}
function rescaleBars() {
  // Charts inside one [data-shared-scale] share the max of all their visible rows.
  const visRows = chart => [...chart.querySelectorAll('.bar-row')].filter(r => !r.classList.contains('tech-off'));
  const rowTotal = r => [...r.querySelectorAll('[data-val]')].reduce((s, e) => s + +e.dataset.val, 0);
  for (const chart of document.querySelectorAll('.bars, .attr')) {
    const vis = visRows(chart);
    const scope = chart.closest('[data-shared-scale]');
    const peers = scope ? [...scope.querySelectorAll('.bars, .attr')] : [chart];
    let max = 1e-6;
    for (const c of peers) for (const r of visRows(c)) { const t = rowTotal(r); if (t > max) max = t; }
    // Bars are drawn against the axis top (a round value), and the axis is rebuilt to match.
    const axis = chart.querySelector(':scope > .axis');
    if (axis) {
      const div = +axis.dataset.div || 1, sc = niceScale(max / div);
      max = sc.top * div;
      axis.innerHTML = sc.ticks.map((t, i) => '<i style="--p:' + (t / sc.top).toFixed(5) + '"><b>' + tickText(t) + (i === sc.ticks.length - 1 ? '<u>' + axis.dataset.unit + '</u>' : '') + '</b></i>').join('');
    }
    vis.forEach(r => { for (const e of r.querySelectorAll('[data-val]')) e.style.width = (+e.dataset.val / max * 100) + '%'; });
    const best = chart.querySelector('.bar-best');
    if (best && vis.length) { best.classList.remove('bar-best'); vis[0].querySelector('.bar-val')?.classList.add('bar-best'); }
  }
  for (const prof of document.querySelectorAll('.prof')) {
    const rows = [...prof.querySelectorAll('.bar-row[data-slices]')].filter(r => !r.classList.contains('tech-off'));
    const diff = prof.querySelector('.prof-diff');
    if (diff) diff.textContent = rows.length > 1 ? profDiff(rows) : '';
  }
  for (const chart of document.querySelectorAll('.bars, .attr')) {
    const vis = [...chart.querySelectorAll('.bar-row')].filter(r => !r.classList.contains('tech-off'));
    // Hover cards: rank and "N× more than <best>" among the visible rows (BarTip's vsBest), by value,
    // since a paired chart keeps the row order of its partner.
    const tips = vis.map(r => [r, r.querySelector('[data-bt-vs]')]).filter(([, n]) => n);
    if (!tips.length) continue;
    const hb = tips[0][1].dataset.hb === '1';
    tips.sort((x, y) => hb ? y[1].dataset.btVs - x[1].dataset.btVs : x[1].dataset.btVs - y[1].dataset.btVs);
    const [topRow, top] = tips[0];
    tips.forEach(([r, note], i) => {
      const rank = r.querySelector('[data-bt-rank]');
      if (rank) rank.textContent = (i + 1) + ' of ' + tips.length;
      const v = +note.dataset.btVs, b = +top.dataset.btVs;
      if (v === b) { note.textContent = 'best in this chart'; return; }
      const ratio = hb ? b / v : v / b;
      note.textContent = ratio.toFixed(ratio < 10 ? 2 : 1) + '× ' + (hb ? 'fewer' : 'more') + ' ' + note.dataset.unit + ' than ' + topRow.querySelector('.bt-title').textContent;
    });
  }
}
// Same idea for the line chart: the y-axis is baked to the global max ms, so hiding the steep
// lanes leaves the rest squished. Reposition every line/dot and relabel the y-ticks against the
// max over the VISIBLE lines, using the geometry stashed in data-geo + the raw ms in data-ms.
function drawSweep() {
  for (const lc of document.querySelectorAll('.lchart')) {
    const [W, H, padL, padR, padT, padB, nlen, yTicks] = lc.dataset.geo.split(',').map(Number);
    const lines = [...lc.querySelectorAll('.lc-line')];
    const visMs = lines.filter(l => !l.classList.contains('tech-off')).flatMap(l => l.dataset.ms.split(',').map(Number));
    const max = Math.max(1e-6, ...visMs);
    const x = i => padL + (i / (nlen - 1)) * (W - padL - padR);
    const y = ms => H - padB - (ms / max) * (H - padT - padB);
    for (const l of lines) l.setAttribute('points', l.dataset.ms.split(',').map((m, i) => x(i) + ',' + y(+m)).join(' '));
    for (const d of lc.querySelectorAll('.lc-dot')) d.setAttribute('cy', y(+d.dataset.ms));
    for (const g of lc.querySelectorAll('[data-yt]')) {
      const ms = (max / yTicks) * +g.dataset.yt, yy = y(ms);
      const ln = g.querySelector('line'); ln.setAttribute('y1', yy); ln.setAttribute('y2', yy);
      const tx = g.querySelector('text'); tx.setAttribute('y', yy + 3); tx.textContent = ms.toFixed(ms < 10 ? 1 : 0);
    }
  }
}
// ---- shared query mirror --------------------------------------------------------
// Both filters serialize into ONE query string: ?lanes= for the technologies and ?show=
// for the benchmark sections. The source/preview toggle rides in ?show= as 'code' because
// it hides the same [data-measure] blocks, so one param restores the whole view. They MUST
// be written together: two independent replaceState calls would each drop the other's
// param. A clean URL is the DEFAULT view, so only a deviation from it appears.
// replaceState can throw on file://, the filters must keep working there, best-effort.
const measurePills = [...document.querySelectorAll('[data-measure-filter]')];
const measureCountEl = document.querySelector('[data-measure-count]');
const codeToggles = [...document.querySelectorAll('[data-code-toggle]')];
const codeYes = codeToggles.find(b => b.dataset.codeToggle === '1');
// The view a reader lands on with no ?lanes=: the React lanes, minus the diagnostic ones.
// Solid is a second axis rather than a longer list, so it starts collapsed — one click on a
// Solid row opens it, and any selection is then shareable through the query string.
const isDefaultLane = b => b.dataset.defaultOff !== '1' && b.dataset.engine !== 'solid';
const showKeys = ['code', ...measurePills.map(b => b.dataset.measureFilter)];
const showOn = k => k === 'code'
  ? !!codeYes && codeYes.classList.contains('active')
  : measurePills.some(b => b.dataset.measureFilter === k && b.classList.contains('active'));

function syncQuery() {
  const parts = [];
  const lanesOn = techPills.filter(b => b.classList.contains('active')).map(b => b.dataset.techFilter);
  // The clean URL is the DEFAULT selection — see isDefaultLane.
  const lanesDef = techPills.filter(isDefaultLane).map(b => b.dataset.techFilter);
  if (!(lanesOn.length === lanesDef.length && lanesOn.every((t, i) => t === lanesDef[i])))
    parts.push('lanes=' + lanesOn.map(encodeURIComponent).join(','));
  const shown = showKeys.filter(showOn);
  if (shown.length !== showKeys.length) parts.push('show=' + shown.map(encodeURIComponent).join(','));
  const qs = parts.length ? '?' + parts.join('&') : '';
  try { history.replaceState(null, '', location.pathname + qs + location.hash); } catch {}
}

// ---- bar hover cards ----------------------------------------------------------------
// Warm a chart once a card has been visible (its CSS fade-in delay has passed), so moving to
// the next row shows that card at once; cool it again shortly after the pointer leaves.
for (const chart of document.querySelectorAll('.bars, .attr')) {
  let warmTimer = 0, coolTimer = 0, lastRow = null;
  chart.addEventListener('pointerover', e => {
    const row = e.target.closest('.bar-track') && e.target.closest('.bar-row[tabindex]');
    if (e.pointerType !== 'mouse' || !row) return;
    clearTimeout(coolTimer);
    if (chart.classList.contains('tip-warm') || row === lastRow) return;
    // Cold: only a rest on one row warms the chart, a sweep across rows does not.
    lastRow = row; clearTimeout(warmTimer);
    warmTimer = setTimeout(() => chart.classList.add('tip-warm'), 460);
  });
  chart.addEventListener('pointerleave', () => {
    clearTimeout(warmTimer); lastRow = null;
    coolTimer = setTimeout(() => chart.classList.remove('tip-warm'), 450);
  });
}
// The card follows the pointer on x: a 1px anchor (.bar-ptr) moves to the pointer inside the
// hovered row (CSS anchors the card to it). After leaving the rows it stays put for the card's
// 100ms fade-out, then goes away.
{
  const ptr = document.createElement('span');
  ptr.className = 'bar-ptr';
  let row = null, x = 0, raf = 0, dropTimer = 0;
  document.addEventListener('pointermove', e => {
    document.body.classList.remove('tip-off');
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    row = e.target.closest && e.target.closest('.bar-track') ? e.target.closest('.bar-row[tabindex]') : null;
    x = e.clientX;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!row) { if (ptr.parentNode && !dropTimer) dropTimer = setTimeout(() => { ptr.remove(); dropTimer = 0; }, 120); return; }
      clearTimeout(dropTimer); dropTimer = 0;
      if (ptr.parentNode !== row) row.append(ptr);
      ptr.style.left = (x - row.getBoundingClientRect().left) + 'px';
    });
  }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.add('tip-off'); });
}
// ---- technologies ---------------------------------------------------------------
function afterTech() {
  if (countEl) countEl.textContent = techPills.filter(b => b.classList.contains('active')).length;
  for (const b of enginePills) b.classList.toggle('active', lanesOfEngine(b.dataset.engineFilter).some(p => p.classList.contains('active')));
  for (const b of groupPills) b.classList.toggle('active', lanesOfGroup(b.dataset.groupFilter).some(p => p.classList.contains('active')));
  for (const e of editors) e.leaveHiddenLane();
  rescaleBars();
  drawSweep();
  syncQuery();
}
for (const b of techPills) b.onclick = () => { setTech(b, !b.classList.contains('active')); afterTech(); };
// An engine row selects that engine's styling techniques in one click. The bare-framework
// lanes stay out of it — they are comparison references, not a styling technique —
// so they keep their own pills. All on already means the click turns them off again.
const enginePills = [...document.querySelectorAll('[data-engine-filter]')];
const lanesOfEngine = eng => techPills.filter(p => p.dataset.engine === eng && p.dataset.floor !== '1');
// A group label does the same for one styling technique, both engines at once — the group IS
// the thing you are asking for, so the baselines are included when you ask for Baseline.
const groupPills = [...document.querySelectorAll('[data-group-filter]')];
const lanesOfGroup = name => techPills.filter(p => p.dataset.group === name);
const toggleAll = lanes => {
  const allOn = lanes.every(p => p.classList.contains('active'));
  for (const p of lanes) setTech(p, !allOn);
  afterTech();
};
for (const b of enginePills) b.onclick = () => toggleAll(lanesOfEngine(b.dataset.engineFilter));
for (const b of groupPills) b.onclick = () => toggleAll(lanesOfGroup(b.dataset.groupFilter));
document.querySelector('[data-tech-all]')?.addEventListener('click', () => { for (const b of techPills) setTech(b, true); afterTech(); });
document.querySelector('[data-tech-none]')?.addEventListener('click', () => { for (const b of techPills) setTech(b, false); afterTech(); });

// ---- benchmarks + source/preview -------------------------------------------------
function setMeasure(b, on) {
  b.classList.toggle('active', on);
  b.setAttribute('aria-pressed', String(on));
  for (const el of document.querySelectorAll('[data-measure="'+b.dataset.measureFilter+'"]')) el.classList.toggle('measure-off', !on);
}
// Source + preview is a Yes/No toggle, not a filter pill, it reveals authored code
// rather than a measurement. Drives the same [data-measure="code"] blocks either way.
function setCode(on) {
  for (const el of document.querySelectorAll('[data-measure="code"]')) el.classList.toggle('measure-off', !on);
  for (const b of codeToggles) {
    const isYes = b.dataset.codeToggle === '1';
    b.classList.toggle('active', isYes === on);
    b.setAttribute('aria-pressed', String(isYes === on));
  }
}
// The count covers the benchmark pills only, source/preview has its own control.
function afterMeasure() {
  if (measureCountEl) measureCountEl.textContent = measurePills.filter(b => b.classList.contains('active')).length;
  syncQuery();
}
for (const b of measurePills) b.onclick = () => { setMeasure(b, !b.classList.contains('active')); afterMeasure(); };
document.querySelector('[data-measure-all]')?.addEventListener('click', () => { for (const b of measurePills) setMeasure(b, true); afterMeasure(); });
document.querySelector('[data-measure-none]')?.addEventListener('click', () => { for (const b of measurePills) setMeasure(b, false); afterMeasure(); });
for (const b of codeToggles) b.onclick = () => { setCode(b.dataset.codeToggle === '1'); afterMeasure(); };
for (const b of document.querySelectorAll('[data-measure-hide]')) b.onclick = () => {
  const k = b.dataset.measureHide;
  if (k === 'code') setCode(false);
  else for (const p of measurePills) if (p.dataset.measureFilter === k) setMeasure(p, false);
  afterMeasure();
};

// ---- apply incoming params BEFORE the first sync, so a shared URL renders
// pre-filtered and syncQuery then just re-serializes the same selection.
const params = new URLSearchParams(location.search);
const lanesParam = params.get('lanes');
if (lanesParam !== null) {
  const want = new Set(lanesParam.split(',').filter(Boolean));
  for (const b of techPills) setTech(b, want.has(b.dataset.techFilter));
} else {
  for (const b of techPills) if (!isDefaultLane(b)) setTech(b, false);
}
const showParam = params.get('show');
if (showParam !== null) {
  const want = new Set(showParam.split(',').filter(Boolean));
  setCode(want.has('code'));
  for (const b of measurePills) setMeasure(b, want.has(b.dataset.measureFilter));
}
afterTech();
afterMeasure();

// ---- contents index --------------------------------------------------------------
// Marks the entry whose section is being read. An IntersectionObserver rather than
// :target, so scrolling updates it and not only clicking. The rootMargin collapses the
// viewport to a band under the header, so exactly one tall section qualifies at a time.
const tocLinks = Array.from(document.querySelectorAll('[data-toc]'));
if (tocLinks.length && 'IntersectionObserver' in window) {
  const targets = tocLinks.map((a) => document.getElementById(a.dataset.toc)).filter(Boolean);
  const inBand = new Set();
  const setActive = (id) => { for (const a of tocLinks) a.classList.toggle('active', a.dataset.toc === id); };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) inBand.add(e.target.id);
      else inBand.delete(e.target.id);
    }
    // Two sections can share the band where one ends and the next begins; the later one
    // is the one being read, so the last match wins.
    const current = targets.findLast((t) => inBand.has(t.id));
    if (current) setActive(current.id);
  }, { rootMargin: '-88px 0px -70% 0px' });
  for (const t of targets) io.observe(t);
  if (targets[0]) setActive(targets[0].id);
  // The closing sections are shorter than the viewport, so they never reach the band;
  // at the bottom of the page the last entry is the one being read.
  addEventListener('scroll', () => {
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) setActive(targets[targets.length - 1].id);
  }, { passive: true });

}
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
