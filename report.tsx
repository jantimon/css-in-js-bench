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
import { CASE_PRIORITY } from "./report/priority.ts";
import { groupTechs } from "./report/families.ts";
import { BarChart, type Bar } from "./report/components/BarChart.tsx";
import { AttributionChart, type AttrRow } from "./report/components/AttributionChart.tsx";
import { InfoTip } from "./report/components/InfoTip.tsx";
import { LineChart, type SweepLine } from "./report/components/LineChart.tsx";
import { StackChart, type StackRow } from "./report/components/StackChart.tsx";
import { RenderTimingChart, type RenderTimingRow } from "./report/components/RenderTimingChart.tsx";
import { WpdBreakdownChart, type WpdBreakdownRow } from "./report/components/WpdBreakdownChart.tsx";
import { Editor, type EditorLane } from "./report/components/Editor.tsx";
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
  const techs = await loadTechs();
  const cases = await loadCases();
  const wpdManifest = validateWpdResults(RESULT);
  const wpdVersion = wpdManifest.wpd.version;
  const wpdLabel = `WPD ${wpdVersion}`;
  const micro = readJson<Record<string, number[]>>(join(RESULT, "measurement-microbench.json"), {});
  const pay = readJson<Record<string, { js: number; css: number; html: number }[]>>(join(RESULT, "measurement-payload.json"), {});
  const acan = readJson<Record<string, number[]>>(join(RESULT, "measurement-autocannon.json"), {});
  const wpdSsr = readJson<Record<string, AttributionSample[]>>(join(RESULT, "measurement-wpd-ssr.json"), {});
  const hyd = readJson<Record<string, number[]>>(join(RESULT, "measurement-hydrate.json"), {});
  const inp = readJson<Record<string, number[]>>(join(RESULT, "measurement-inp.json"), {});
  const mount = readJson<Record<string, number[]>>(join(RESULT, "measurement-mount.json"), {});
  const nsweep = readJson<Record<string, NsweepSample[]>>(join(RESULT, "measurement-nsweep.json"), {});
  const wpdHydrate = readJson<Record<string, WpdBrowserSample[]>>(join(RESULT, "measurement-wpd-hydrate.json"), {});
  const wpdInp = readJson<Record<string, WpdBrowserSample[]>>(join(RESULT, "measurement-wpd-inp.json"), {});
  const wpdMount = readJson<Record<string, WpdBrowserSample[]>>(join(RESULT, "measurement-wpd-mount.json"), {});
  const wpdFirefox = readJson<Record<string, WpdFirefoxSample[]>>(join(RESULT, "measurement-wpd-firefox.json"), {});
  const wpdBlame = readJson<Record<string, WpdBlameSample[]>>(join(RESULT, "measurement-wpd-blame.json"), {});
  const shots = readJson<Record<string, string[]>>(join(RESULT, "measurement-screenshots.json"), {});
  const snaps = readJson<Record<string, Snapshot>>(join(RESULT, "snapshot.json"), {});

  // Screenshots live in result/assets/; mirror them next to BENCHMARK.html so the
  // self-contained report can reference assets/<…>.png (§10.6 — single file except images).
  const assetsSrc = join(RESULT, "assets");
  const assetsDst = join(ROOT, "assets");
  rmSync(assetsDst, { recursive: true, force: true });
  if (existsSync(assetsSrc)) cpSync(assetsSrc, assetsDst, { recursive: true });
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
  const techGroups = groupTechs(usedTechs);

  const sections = caseIds.map((caseId) => {
    const cm = cases[caseId];
    const bars: Bar[] = usedTechs
      .filter((t) => micro[`${caseId}/${t}`])
      .map((t) => {
        const xs = micro[`${caseId}/${t}`];
        return { tech: t, label: techs[t].label, color: techs[t].bench.color, value: median(xs), spread: spread(xs) };
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
    // inp: click→next-paint of an in-place re-render (ms, lower better) — optional/heavy.
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
        const timingMedian = timing.stats?.medianMs ?? (timing.perIteration.length ? median(timing.perIteration) : undefined);
        return { tech: t, label: techs[t].label, span: sample.span!, medianMs: timingMedian };
      });
    const hydWpdRows = wpdRows(wpdHydrate);
    const inpWpdRows = wpdRows(wpdInp);
    const mountWpdRows = wpdRows(wpdMount);
    // nsweep: render time vs instance count (one line per lane) — optional/heavy.
    const sweepLines: SweepLine[] = usedTechs
      .filter((t) => nsweep[`${caseId}/${t}`]?.length)
      .map((t) => ({ tech: t, label: techs[t].label, color: techs[t].bench.color, points: nsweep[`${caseId}/${t}`] }));
    // Browser rendering work on a cold mount, sourced exclusively from the canonical WPD run.
    const rtRows: RenderTimingRow[] = usedTechs
      .filter((t) => wpdMount[`${caseId}/${t}`]?.[0]?.span)
      .map((t) => {
        const mountSample = wpdMount[`${caseId}/${t}`][0];
        const chrome = mountSample.span!;
        const counts = wpdBlame[`${caseId}/${t}`][0];
        const ff = wpdFirefox[`${caseId}/${t}`][0];
        const metric = (engine: "chrome" | "firefox") => {
          const isChrome = engine === "chrome";
          const slices = isChrome ? chrome.slices : ff.breakdown;
          return {
            layoutCount: isChrome ? counts.layoutCount : ff.counts.layout,
            layoutMs: slices?.layout ?? null,
            styleCount: isChrome ? counts.styleCount : ff.counts.style,
            styleMs: slices?.style ?? null,
            paintCount: isChrome ? counts.paintCount : ff.counts.paint,
            paintMs: isChrome ? chrome.slices.paint : null,
            forcedLayoutCount: isChrome ? counts.forcedLayoutCount : ff.counts.forcedLayout,
            forcedLayoutMs: isChrome ? counts.forcedLayoutMs : null,
          };
        };
        return { tech: t, label: techs[t].label, n: wpdManifest.config.n, chrome: metric("chrome"), firefox: metric("firefox") };
      });
    // editor lanes = lanes that captured a source snapshot (the iframe files exist for them);
    // each also carries its rendered-preview PNG (if screenshots ran) so the editor's "preview"
    // tab can show that lane's output inline — one image, switched with the selected lane.
    const editorLanes: EditorLane[] = usedTechs
      .filter((t) => snaps[`${caseId}/${t}`])
      .map((t) => ({ tech: t, label: techs[t].label, preview: shots[`${caseId}/${t}`]?.[0] }));
    return { caseId, cm, bars, payRows, acanBars, attrRows, hydBars, hydWpdRows, inpBars, inpWpdRows, mountBars, mountWpdRows, sweepLines, rtRows, editorLanes };
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
          content="styled-components, Emotion, Goober, next-yak, StyleX, Panda, Tailwind — identical workloads, measured SSR + client cost."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jantimon.github.io/css-in-js-bench/" />
        <link rel="canonical" href="https://jantimon.github.io/css-in-js-bench/" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <header className="page-head">
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
                One set of React components, built {usedTechs.length} different ways and measured head-to-head on identical
                workloads — so the numbers compare by construction, not by claim.
              </p>
              <div className="head-stats">
                <span>
                  <b>{usedTechs.length}</b> styling techniques
                </span>
                <span>
                  <b>{caseIds.length}</b> {caseIds.length === 1 ? "workload" : "workloads"}
                </span>
                <span>production React · median of repeated runs</span>
              </div>
            </div>
          </div>
        </header>

        <nav className="measure-nav" aria-label="Report measurements">
          <div className="measure-inner">
            <div className="show">
              <span className="show-label">Show</span>
              <div className="show-pills">
                {[
                  ["code", "Source + preview"],
                  ["microbench", "Throughput"],
                  ["autocannon", "Load req/s"],
                  ["attribution", "CPU split"],
                  ["hydrate", "Hydration"],
                  ["inp", "Interaction"],
                  ["mount", "Cold mount"],
                  ["render-timing", "Paint/Layout"],
                  ["payload", "Page bytes"],
                  ["nsweep", "Scaling"],
                ].map(([k, label]) => (
                  <button type="button" className="show-pill active" data-measure-filter={k} aria-pressed="true" key={k}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <main className="wrap">
          <section className="tech-panel">
            <div className="tp-head">
              <div className="tp-title">
                Technologies <span className="tp-count"><span data-tech-count>{usedTechs.length}</span> / {usedTechs.length} shown</span>
              </div>
              <div className="tp-actions">
                <button type="button" data-tech-all>
                  All
                </button>
                <span className="tp-sep">·</span>
                <button type="button" data-tech-none>
                  None
                </button>
              </div>
            </div>
            {techGroups.map((g) => (
              <div className="tp-row" key={g.group}>
                <span className="tp-group">{g.group}</span>
                <div className="tp-pills">
                  {g.items.map((it) => (
                    <button type="button" className="tech-pill active" data-tech-filter={it.tech} title={techs[it.tech].label} key={it.tech}>
                      <span className="tp-swatch" style={{ background: techs[it.tech].bench.color }} />
                      {it.short}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {sections.map(({ caseId, cm, bars, payRows, acanBars, attrRows, hydBars, hydWpdRows, inpBars, inpWpdRows, mountBars, mountWpdRows, sweepLines, rtRows, editorLanes }) => {
            const [caseTitle, caseSub] = cm.label.split(/\s+—\s+/, 2);
            return (
            <details className="case" open key={caseId}>
              <summary>
                <span className="case-title">{caseTitle}</span>
                {caseSub ? <span className="case-sub">{caseSub}</span> : null}
                <span className="chip">n = {cm.n.toLocaleString()}</span>
                <span className="chip">{cm.cardinality} cardinality</span>
              </summary>
              <p className="case-desc">{cm.description}</p>
            <div data-measure="code">
              <h3 className="chart-title">Source · generated HTML · generated CSS · rendered preview</h3>
              <Editor caseId={caseId} lanes={editorLanes} />
            </div>
            <div data-measure="microbench">
              <h3 className="chart-title">
                SSR render throughput — renders / sec · higher is better
                <InfoTip>
                  How many times per second this lane renders the whole workload to an HTML string in Node
                  (<code>renderToString</code>), timing the production render only — any build-time CSS collection (a Tailwind
                  JIT, a Panda sheet slice) is excluded. Higher is better.
                </InfoTip>
              </h3>
              <BarChart bars={bars} unit="r/s" higherBetter />
            </div>
            {acanBars.length ? (
              <div data-measure="autocannon">
                <h3 className="chart-title">
                  SSR throughput under load — requests / sec · higher is better
                  <InfoTip>
                    Requests/sec the lane sustains under concurrent HTTP load (autocannon) serving the SSR render end-to-end —
                    a more realistic server measure than the in-process microbench. Higher is better.
                  </InfoTip>
                </h3>
                <BarChart bars={acanBars} unit="req/s" higherBetter />
              </div>
            ) : null}
            {attrRows.length ? (
              <div data-measure="attribution">
                <h3 className="chart-title">
                  Where the SSR render time goes — {wpdLabel} Node CPU self-time · median ms / render
                  <InfoTip>
                    The median server <code>renderToString()</code>, measured by <b>{wpdLabel}</b> and split by CPU self-time from a sampled V8 profile mapped
                    through source maps: <b>react-dom</b> (the floor every lane shares), the <b>styling library</b>'s runtime,
                    and <b>your component</b>. <b>other</b> is GC / unattributed native work.
                  </InfoTip>
                </h3>
                <AttributionChart rows={attrRows} />
              </div>
            ) : null}
            {hydWpdRows.length || hydBars.length ? (
              <div data-measure="hydrate">
                <h3 className="chart-title">
                  Client hydration — repeated timing + {wpdLabel} span anatomy
                  <InfoTip>
                    Time for React to <b>hydrate</b> the server HTML in the browser — attach event handlers and build the
                    fiber tree over the existing DOM (it does not re-create markup). The first chart is the existing repeated
                    end-to-end timing; the {wpdLabel} chart then splits one instrumented commit into JS, style, layout, paint,
                    GC, browser work and idle. Lower is better.
                  </InfoTip>
                </h3>
                {hydBars.length ? <BarChart bars={hydBars} unit="ms" higherBetter={false} /> : null}
                <WpdBreakdownChart rows={hydWpdRows} wpdVersion={wpdVersion} />
              </div>
            ) : null}
            {inpWpdRows.length || inpBars.length ? (
              <div data-measure="inp">
                <h3 className="chart-title">
                  Interaction re-render — repeated timing + {wpdLabel} span anatomy
                  <InfoTip>
                    A state change triggers a <b>synchronous re-render</b> (<code>flushSync</code>) of the whole mounted
                    workload, then we wait for the next paint — click→paint latency. WPD separates active work from the
                    frame-alignment idle that used to dominate this number. This
                    is where <b>runtime</b> CSS-in-JS libraries re-run their per-element styling on every update; build-time
                    lanes (next-yak / Panda / Tailwind / vanilla) do almost none. Lower is better.
                  </InfoTip>
                </h3>
                {inpBars.length ? <BarChart bars={inpBars} unit="ms" higherBetter={false} /> : null}
                <WpdBreakdownChart rows={inpWpdRows} wpdVersion={wpdVersion} />
              </div>
            ) : null}
            {mountWpdRows.length || mountBars.length ? (
              <div data-measure="mount">
                <h3 className="chart-title">
                  Cold mount — repeated timing + {wpdLabel} span anatomy
                  <InfoTip>
                    Starting from a <b>blank root</b> (no SSR markup), a "click" renders the whole workload from scratch
                    (<code>createRoot().render()</code>), then we wait for the first paint. Unlike hydration — which attaches to
                    existing server HTML — this is a cold client mount, so the first paint includes each <b>runtime</b>
                    library's <b>first style injection</b> into the document. WPD's reconciling span shows how much of the
                    commit is JS, style, layout, paint, GC, browser work and idle. Lower is better.
                  </InfoTip>
                </h3>
                {mountBars.length ? <BarChart bars={mountBars} unit="ms" higherBetter={false} /> : null}
                <WpdBreakdownChart rows={mountWpdRows} wpdVersion={wpdVersion} />
              </div>
            ) : null}
            {rtRows.length ? (
              <div data-measure="render-timing">
                <h3 className="chart-title">
                  Browser render-work on a cold mount — style-recalc / layout / paint · Chrome + Firefox
                  <InfoTip>
                    Where the browser's <b>rendering</b> time goes on a cold mount (not JS — the engine's own style-recalc,
                    layout and paint), measured by <a href="https://github.com/jantimon/web-performance-debugger">wpd</a> in
                    two engines. This is where <b>runtime</b> CSS-in-JS pays a tax build-time lanes don't: it injects a style
                    rule per instance, so the engine recalculates styles once per instance — <b>Chrome</b>'s authoritative
                    signal is that <b>style-recalc count</b> (the badge; e.g. 50 instances → ~50 recalcs vs 1 for extracted
                    CSS). <b>Firefox</b> (Gecko) reports sampled style/layout time; a zero sampled slice is not proof of no
                    work, so its exact counts are retained as diagnostics but the chart never treats zero as absence.
                    Bars are ms; compare within an engine. Lower is better. Generated via <code>pnpm setup:wpd</code> + <code>pnpm gen:wpd</code>.
                  </InfoTip>
                </h3>
                <RenderTimingChart rows={rtRows} />
              </div>
            ) : null}
            {payRows.length ? (
              <div data-measure="payload">
                <h3 className="chart-title">
                  Page bytes shipped — JS + CSS + HTML, gzipped · lower is better
                  <InfoTip>
                    Gzipped bytes the browser downloads for this page: the client JS runtime the lane ships (over the bare
                    React floor), the CSS, and the SSR HTML. Lower is better.
                  </InfoTip>
                </h3>
                <StackChart rows={payRows} segs={PAY_SEGS} unit="B" higherBetter={false} />
              </div>
            ) : null}
            {sweepLines.length ? (
              <div data-measure="nsweep">
                <h3 className="chart-title">
                  Scaling — SSR render time (ms) vs instance count
                  <InfoTip>
                    SSR render time as the workload grows from a handful to thousands of instances — shows how each lane's
                    per-element cost compounds. A flatter line scales better.
                  </InfoTip>
                </h3>
                <LineChart lines={sweepLines} />
              </div>
            ) : null}
            </details>
            );
          })}
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
  writeFileSync(join(ROOT, "BENCHMARK.md"), renderMarkdown(sections, techs, meta, wpdVersion));

  console.log(`✓ wrote BENCHMARK.html + BENCHMARK.md — ${sections.length} case(s), ${usedTechs.length} lane(s)`);

  // Bundle the report into a single self-contained BENCHMARK.zip (the html + every asset it
  // references: screenshots and the iframe code files under assets/) so it can be sent as one
  // file and opened from disk. Shells out to `zip` (zero deps); skipped with a note if absent.
  const zipParts = ["BENCHMARK.html", "BENCHMARK.md", ...(existsSync(join(ROOT, "assets")) ? ["assets"] : [])];
  rmSync(join(ROOT, "BENCHMARK.zip"), { force: true }); // rebuild, don't append into a stale archive
  try {
    execFileSync("zip", ["-r", "-q", "-X", "BENCHMARK.zip", ...zipParts], { cwd: ROOT });
    console.log(`✓ bundled BENCHMARK.zip — ${zipParts.join(" + ")}`);
  } catch {
    console.warn("  ⚠ BENCHMARK.zip skipped — the `zip` command isn't available on PATH.");
  }
}

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#080a0d;color:#e6edf3;font:15px/1.5 system-ui,sans-serif;padding:0 0 80px}
.wrap{max-width:1000px;margin:0 auto;padding:0 24px}
.page-head{background:#0d1117}
.head-inner{max-width:1000px;margin:0 auto;padding:18px 24px}
.measure-nav{position:sticky;top:0;z-index:5;margin-bottom:24px;border-block:1px solid #1c2128;background:#0d1117ee;backdrop-filter:blur(6px)}
.measure-inner{max-width:1000px;margin:0 auto;padding:8px 24px}
h1{margin:0 0 4px;font-size:20px;display:flex;align-items:center;gap:9px}
.brand-dot{width:11px;height:11px;border-radius:50%;background:#3fb950;box-shadow:0 0 0 3px #3fb95022}
.gh-link{display:inline-flex;align-items:center;color:#8b949e;margin-left:2px}
.gh-link:hover{color:#e6edf3}
.sub{margin:0;color:#adbac7;font:13px/1.55 system-ui,sans-serif;max-width:60ch}
.head-stats{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:9px;font-size:12px;color:#8b949e}
.head-stats b{color:#e6edf3;font-weight:600}
.head-stats span:not(:first-child)::before{content:"·";margin-right:10px;color:#444c56}
.show{display:flex;align-items:center;gap:10px;min-width:0}
.show-label{flex:none;color:#6e7681;text-transform:uppercase;font-size:10px;letter-spacing:.08em}
.show-pills{display:flex;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:none}
.show-pills::-webkit-scrollbar{display:none}
.show-pill{flex:none;white-space:nowrap;background:#161b22;color:#8b949e;border:1px solid #21262d;border-radius:7px;padding:5px 11px;font-size:12.5px;cursor:pointer;user-select:none}
.show-pill:hover{color:#c9d1d9}
.show-pill.active{background:#21262d;color:#e6edf3;border-color:#30363d}
.tech-panel{border:1px solid #1c2128;border-radius:12px;padding:18px 20px;background:#0d1117;margin-bottom:24px}
.tp-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.tp-title{font-size:14px;font-weight:650}
.tp-count{color:#6e7681;font-weight:400;font-size:12.5px;margin-left:4px}
.tp-actions{font-size:12.5px;color:#8b949e}
.tp-actions button{background:none;border:0;color:#58a6ff;cursor:pointer;font-size:12.5px;padding:0}
.tp-actions button:hover{text-decoration:underline}
.tp-sep{margin:0 7px;color:#30363d}
.tp-row{display:flex;align-items:center;gap:16px;padding:5px 0}
.tp-group{flex:0 0 150px;color:#6e7681;text-transform:uppercase;font-size:10.5px;letter-spacing:.06em}
.tp-pills{display:flex;flex-wrap:wrap;gap:7px}
.tech-pill{display:inline-flex;align-items:center;gap:7px;background:#161b22;color:#adbac7;border:1px solid #21262d;border-radius:999px;padding:4px 12px 4px 9px;font-size:12.5px;cursor:pointer;user-select:none}
.tech-pill:hover{border-color:#30363d}
.tech-pill.active{color:#e6edf3}
.tech-pill:not(.active){opacity:.4}
.tech-pill:not(.active) .tp-swatch{filter:grayscale(1)}
.tp-swatch{width:9px;height:9px;border-radius:50%;display:inline-block}
[data-measure].measure-off{display:none}
.case{margin:0 0 18px;border:1px solid #1c2128;border-radius:12px;padding:4px 22px 18px;background:#0d1117}
.case>summary{list-style:none;cursor:pointer;padding:18px 0 6px;display:flex;align-items:baseline;gap:11px;flex-wrap:wrap}
.case>summary::-webkit-details-marker{display:none}
.case-title{font-size:19px;font-weight:680}
.case-sub{color:#8b949e;font-size:14px}
.chip{font:11.5px/1 ui-monospace,monospace;color:#8b949e;background:#161b22;border:1px solid #21262d;border-radius:6px;padding:4px 8px}
.case-desc{color:#8b949e;margin:0 0 8px;max-width:92ch;font-size:13.5px}
.chart-title{font-size:11.5px;color:#6e7681;text-transform:uppercase;letter-spacing:.05em;margin:24px 0 12px;font-weight:600}
.info{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:7px;border:1px solid #30363d;border-radius:50%;font:italic 700 9px/1 Georgia,serif;color:#8b949e;cursor:help;position:relative;text-transform:none;letter-spacing:0;vertical-align:middle}
.info:hover{color:#c9d1d9;border-color:#6e7681}
.info .tip{display:none;position:absolute;bottom:150%;left:50%;transform:translateX(-50%);width:max-content;max-width:330px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:9px 11px;font:400 12px/1.55 -apple-system,system-ui,sans-serif;color:#c9d1d9;text-transform:none;letter-spacing:0;z-index:30;box-shadow:0 8px 24px rgba(0,0,0,.55);white-space:normal;text-align:left}
.info:hover .tip,.info:focus .tip{display:block}
.bars{display:flex;flex-direction:column;gap:7px;margin-bottom:8px}
.bar-row{display:grid;grid-template-columns:230px 1fr auto;align-items:center;gap:12px}
.bar-row.tech-off{display:none}
.bar-row.gap-before{margin-top:6px}
.bar-label{text-align:right;color:#c9d1d9;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{background:#161b22;border-radius:5px;height:18px;overflow:hidden}
.bar-fill{display:block;height:100%;border-radius:5px}
.bar-val{font-variant-numeric:tabular-nums;font-size:13px;min-width:120px}
.bar-best{font-weight:700;color:#3fb950}
.bar-unit,.bar-spread{color:#8b949e;font-size:11px}
.bar-breakdown{margin-left:8px;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.bar-breakdown .bd-sep{color:#6e7681}
.attr .bar-track{display:flex;height:12px}
.attr .bar-row{margin-bottom:7px}
.attr-seg{display:block;height:100%}
.attr-seg:first-child{border-radius:5px 0 0 5px}
.attr-legend{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:10px;font-size:12px;color:#8b949e}
.attr-legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.rt .bar-label{display:flex;gap:7px;justify-content:flex-end;align-items:baseline}
.rt-lane{color:#c9d1d9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rt-eng{color:#6e7681;font-size:11px;flex:none}
.rt-badge{margin-left:8px;padding:1px 6px;border:1px solid #30363d;border-radius:999px;font-size:11px;color:#adbac7;font-variant-numeric:tabular-nums}
.rt-note{margin:8px 0 0;font-size:11px;line-height:1.5;color:#6e7681}
.rt .bar-val{min-width:150px}
.wpd-breakdown{margin-top:14px;padding-top:12px;border-top:1px dashed #30363d}
.lchart svg{width:100%;max-width:760px;height:auto}
.lc-axis{fill:#8b949e;font-size:10px}
.lc-line{stroke-width:1.5;fill:none}
.lc-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;font-size:12px;color:#adbac7}
.lc-legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.lc-legend span.tech-off,.lc-line.tech-off,.lc-dot.tech-off{display:none}
.editor{display:flex;border:1px solid #21262d;border-radius:8px;overflow:hidden;margin-bottom:8px;background:#0d1117}
.ed-side{flex:0 0 200px;border-right:1px solid #21262d;padding:6px 0;overflow:auto}
.ed-file{display:block;width:100%;text-align:left;background:none;border:0;color:#8b949e;padding:5px 12px;font:12.5px/1.3 system-ui,sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-file:hover{background:#161b22;color:#c9d1d9}
.ed-file.active{background:#21262d;color:#e6edf3}
.ed-file.tech-off{display:none}
.ed-main{flex:1;min-width:0;display:flex;flex-direction:column}
.ed-tabs{display:flex;background:#11161d;border-bottom:1px solid #21262d;overflow:auto}
.ed-tab{background:none;border:0;border-right:1px solid #21262d;color:#8b949e;padding:8px 16px;font:12.5px/1 ui-monospace,monospace;cursor:pointer;white-space:nowrap}
.ed-tab:hover{color:#c9d1d9}
.ed-tab.active{background:#0d1117;color:#e6edf3;box-shadow:inset 0 -2px 0 #1f6feb}
.ed-frame{width:100%;height:520px;border:0;background:#0d1117}
.ed-shot{display:none;width:100%;height:520px;object-fit:contain;object-position:center;background:#fff;box-sizing:border-box;padding:16px}
.editor.ed-show-shot .ed-frame{display:none}
.editor.ed-show-shot .ed-shot{display:block}
.page-foot{color:#6e7681;font-size:12px;max-width:1000px;margin:0 auto;padding:8px 24px}
code{background:#161b22;padding:1px 5px;border-radius:4px;font-size:12px}
@media(max-width:767px){
  .wrap{padding-inline:12px}
  .head-inner,.measure-inner{padding-inline:12px}
  .measure-nav{position:static}
  .tech-panel{padding-inline:14px}
  .case{padding:4px 14px 16px}
  .bar-row{grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:4px 8px}
  .bar-label{grid-column:1;grid-row:1;min-width:0;text-align:left;line-height:1.35;white-space:normal}
  .bar-track{grid-column:1/-1;grid-row:2;width:100%;height:10px}
  .bar-val{grid-column:2;grid-row:1;min-width:0;text-align:right;line-height:1.35;white-space:nowrap}
  .bar-breakdown{display:block;margin-left:0;font-size:10.5px}
  .rt .bar-label{justify-content:flex-start}
  .rt .bar-val{min-width:0}
  .editor{display:block}
  .ed-side{display:flex;width:100%;padding:0;border-right:0;border-bottom:1px solid #21262d;overflow-x:auto}
  .ed-file{flex:0 0 auto;width:auto;padding:9px 12px}
  .ed-main{width:100%}
  .ed-frame,.ed-shot{height:min(440px,65vh)}
  .ed-shot{padding:8px}
  .info .tip{position:fixed;left:12px;right:12px;bottom:12px;width:auto;max-width:none;transform:none}
  .page-foot{padding-inline:12px}
}
@media print{.measure-nav{position:static}}
`;

const CONTROLLER = `
for (const ed of document.querySelectorAll('[data-ed]')) {
  const frame = ed.querySelector('.ed-frame');
  const shot = ed.querySelector('.ed-shot');
  const apply = () => {
    for (const b of ed.querySelectorAll('.ed-file')) b.classList.toggle('active', b.dataset.lane===ed.dataset.lane);
    for (const b of ed.querySelectorAll('.ed-tab')) b.classList.toggle('active', b.dataset.art===ed.dataset.art);
    const preview = ed.dataset.art==='preview';
    ed.classList.toggle('ed-show-shot', preview);
    if (preview) {
      // every lane renders identically, so the image rarely changes — the highlighted lane
      // name in the sidebar is what signals which lane's render you're viewing.
      const psrc = ed.querySelector('.ed-file[data-lane="'+ed.dataset.lane+'"]')?.dataset.preview || '';
      if (shot.getAttribute('src')!==psrc) shot.setAttribute('src', psrc);
    } else {
      const src = 'assets/code/'+ed.dataset.case+'__'+ed.dataset.lane+'__'+ed.dataset.art+'.html';
      if (frame.getAttribute('src')!==src) frame.setAttribute('src', src);
    }
  };
  for (const b of ed.querySelectorAll('.ed-file')) b.onclick = () => { ed.dataset.lane = b.dataset.lane; apply(); };
  for (const b of ed.querySelectorAll('.ed-tab')) b.onclick = () => { ed.dataset.art = b.dataset.art; apply(); };
  apply();
}
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
function rescaleBars() {
  for (const chart of document.querySelectorAll('.bars, .attr')) {
    const vis = [...chart.querySelectorAll('.bar-row')].filter(r => !r.classList.contains('tech-off'));
    let max = 1e-6;
    const totals = vis.map(r => [...r.querySelectorAll('[data-val]')].reduce((s, e) => s + +e.dataset.val, 0));
    for (const t of totals) if (t > max) max = t;
    vis.forEach(r => { for (const e of r.querySelectorAll('[data-val]')) e.style.width = (+e.dataset.val / max * 100) + '%'; });
    const best = chart.querySelector('.bar-best');
    if (best && vis.length) { best.classList.remove('bar-best'); vis[0].querySelector('.bar-val')?.classList.add('bar-best'); }
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
// Mirror the lane selection into ?lanes=a,b so a filtered view is a shareable URL.
// No param = all lanes (the default view keeps a clean URL). replaceState can throw
// on file:// — the filter must keep working there, so it's best-effort.
function syncLanesQuery() {
  const on = techPills.filter(b => b.classList.contains('active')).map(b => b.dataset.techFilter);
  const qs = on.length === techPills.length ? '' : '?lanes=' + on.map(encodeURIComponent).join(',');
  try { history.replaceState(null, '', location.pathname + qs + location.hash); } catch {}
}
function afterTech() {
  if (countEl) countEl.textContent = techPills.filter(b => b.classList.contains('active')).length;
  for (const ed of document.querySelectorAll('[data-ed]')) {
    const active = ed.querySelector('.ed-file[data-lane="'+ed.dataset.lane+'"]');
    if (active && active.classList.contains('tech-off')) ed.querySelector('.ed-file:not(.tech-off)')?.click();
  }
  rescaleBars();
  drawSweep();
  syncLanesQuery();
}
for (const b of techPills) b.onclick = () => { setTech(b, !b.classList.contains('active')); afterTech(); };
document.querySelector('[data-tech-all]')?.addEventListener('click', () => { for (const b of techPills) setTech(b, true); afterTech(); });
document.querySelector('[data-tech-none]')?.addEventListener('click', () => { for (const b of techPills) setTech(b, false); afterTech(); });
// Apply an incoming ?lanes= BEFORE the initial afterTech, so a shared URL renders
// pre-filtered (and syncLanesQuery then just re-serializes the same selection).
const lanesParam = new URLSearchParams(location.search).get('lanes');
if (lanesParam !== null) {
  const want = new Set(lanesParam.split(',').filter(Boolean));
  for (const b of techPills) setTech(b, want.has(b.dataset.techFilter));
}
afterTech();
// measure pills — toggle which measurement sections are visible.
for (const b of document.querySelectorAll('[data-measure-filter]')) b.onclick = () => {
  const on = b.classList.toggle('active');
  b.setAttribute('aria-pressed', String(on));
  for (const el of document.querySelectorAll('[data-measure="'+b.dataset.measureFilter+'"]')) el.classList.toggle('measure-off', !on);
};
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
