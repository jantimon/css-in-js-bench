# CSS-in-JS benchmarks

**Live report: <https://jantimon.github.io/css-in-js-bench/>**

Compares CSS-in-JS and utility styling strategies on identical workloads — React for
almost every lane, plus a Solid 2 pair with its own framework floor.
Every strategy ("lane") renders the same components under the same conditions, so the
numbers are actually comparable

The question behind it: for a real component, what does each approach cost at SSR, in
render time and in bytes shipped, and what markup + CSS does it actually emit

## Philosophy

Two rules shape everything here:

- **Fairness.** The workload is defined once, in `cases/`, and applied to every lane. A
  case fixes the instance count (`n`) and the cardinality, and a lane may never change
  them. So when StyleX beats styled-components, it's on the same 1,000 buttons
- **Isolation.** Each lane is its own package under `techs/<lane>/` with its own
  `package.json`, its own declared dependencies, and its own build config. A
  styled-components lane physically can't import goober or a stray React copy, it only
  sees what it declares

There is no central registry. A lane exists because its folder exists, and a
`(case, tech)` cell is measured because `techs/<tech>/case/<case>/index.tsx` exists.
Adding a lane or a case is a folder, never an edit to a shared list

## How to read the report

For each case you get:

- **SSR render throughput** (renders/sec, higher better): the production SSR work only.
  For runtime libraries this includes their style injection, for build-time libraries it's
  the class-name generation. The CSS collection for the report is not timed here
- **Page bytes shipped** (JS + CSS + HTML, gzipped, lower better): what the page costs on
  the wire. Runtime libs ship the critical CSS they injected, atomic/extracted libs ship
  the slice of their build-time sheet the page used. JS is the lane's marginal client
  bundle over its own bare-framework floor (gzipped `hydrate` build minus `vanilla`'s, or
  minus `vanilla-solid`'s for the Solid lanes), so it's the same for every case of a lane
- **SSR throughput under load** (requests/sec, higher better): a real HTTP server renders
  the page per request while autocannon hammers it. Heavy and machine-dependent
- **Where the SSR render time goes** (CPU attribution): the median render split into the
  UI framework (react-dom, or solid for the Solid lanes — the floor every lane of that
  framework shares) vs the styling library's own runtime vs your component, profiled in
  node V8 and mapped back to each package via the bundle sourcemap. This is why a
  throughput number looks the way it does
- **Client hydration time** (ms, lower better): Playwright loads the SSR markup plus a
  per-tech browser build that `hydrateRoot`s it, and times the hydration commit
- **Where the client hydration time goes** (CPU attribution): the same react /
  styling-lib / your-component split, but profiled in the browser over exactly the
  hydration commit (CDP Profiler + source maps, hydration deferred behind `?manual=1` so
  the samples are clean). Build-time lanes show ~zero styling-lib cost, runtime CSS-in-JS
  shows its client runtime as a real segment
- **Interaction → next paint** (ms, lower better): a `flushSync` re-render of the mounted
  workload in place, then a wait for paint. The per-element runtime cost a user actually
  feels
- **Where the interaction time goes** (CPU attribution): that re-render, split per package
  in the browser. This is where runtime libraries re-run their styling on every update
- **Where the cold-mount time goes** (CPU attribution): starting from a blank root (no SSR
  markup), a "click" renders the whole workload from scratch (`createRoot().render()`),
  then we wait for the first paint. Unlike hydration this is a cold client mount, so the
  first paint includes each runtime library's first style injection into the document.
  The build-time lanes inject nothing
- **Browser render work on cold mount** (Chrome counts + Firefox ms, lower better): the
  browser engine's style recalculation, layout and paint work for that same blank-root
  mount, captured by `wpd`. This is an opt-in heavyweight pass
- **Scaling** (render time vs instance count): the nsweep, how each lane's render time
  grows with n (= distinct values for dynamic cases). Flat for build-time CSS, steep for
  runtime-per-value libs

Each case leads with its source + preview (the input), then the performance charts (the
result). The code-editor view lists every lane in a sidebar, with tabs for **index.tsx**
(the verbatim benchmarked source, no second copy), **output.html** and **output.css**
(what that lane actually emitted: class soup vs one hashed class vs inline-style vars),
and **preview** (the rendered screenshot). The generated HTML/CSS are Prettier-formatted
for reading, but the byte sizes and class counts in the status bar are measured on the
raw emitted output. Since every lane renders identically, the preview is the same image
for all of them

Every lane is built in production mode (React's prod runtime). The next-yak lanes all use
published npm packages, in two API flavours (styled and css-prop) across two build
settings: `next-yak` / `next-yak-css`, which fold static styles at build time, and
`next-yak-nofold` / `next-yak-css-nofold`, which set `foldStatic: false` to keep the
runtime path

The report is `BENCHMARK.html` plus a sibling `assets/` folder: screenshots and the
editor's Shiki-highlighted code files, loaded one at a time via an `<iframe>` (keeps the
main HTML small, works from `file://`). `report` also bundles everything into
`BENCHMARK.zip` so it can be sent as one file. Charts and toggles are progressive
enhancement (no hydration), and the lane filter is mirrored into the `?lanes=` query
param, so a filtered view is a shareable URL

Some measurements are machine-dependent and noisy (anything that boots a browser or a
server). Those carry that caveat in the report and live in a collapsible appendix

## Running it

```bash
pnpm install
pnpm setup:wpd  # install pinned WPD + Chrome/Firefox in ignored vendor/wpd (Node 24+)
pnpm gen        # full suite: gen:samples → gen:wpd → report (this is the one you usually want)

# or run the stages on their own:
pnpm gen:samples  # build every lane in isolation, write raw samples → result/ (then verifies)
pnpm gen:wpd      # mandatory WPD lanes, sequential: SSR, mount (a breakdown+deep run group), hydrate, INP, Firefox
pnpm report       # reduce samples → BENCHMARK.html + BENCHMARK.md (+ BENCHMARK.zip to share)
pnpm verify     # parity gate: every lane renders the same DOM + pixels (gen:samples runs this too)
pnpm lint       # validate every tech package's schema
pnpm dev        # author a single cell with HMR
```

### How the next-yak lanes get the library

Every next-yak lane pins a published npm version, so `pnpm install` is all it takes.
There are two settings, each as a styled + css-prop pair:

- `next-yak` / `next-yak-css` — folding on, the default. A static styled usage compiles to
  a plain element with a `className`, and a static `css` prop becomes a plain `className`,
  both skipping the runtime wrapper.
- `next-yak-nofold` / `next-yak-css-nofold` — `foldStatic: false` passed to `viteYak` in
  each lane's vite configs, which turns folding off and keeps the runtime path, so the two
  pairs isolate what folding is worth.

Within a pair, styled vs css-prop syntax is the only difference.

### The Solid lanes

`yak-solid` runs [`@yak/solid`](https://www.npmjs.com/package/@yak/solid) — the same yak
compiler with a Solid 2 runtime — over the same 14 workloads, styled API only.
`vanilla-solid` is its floor: the identical case tree written by hand with plain class
names, no styling library, the way `vanilla` is the floor for the React lanes. It's hidden
by default in the lane filter.

Three things follow from Solid not being React, and they are worth knowing before reading
a chart that mixes them:

- **Bytes.** The JS number is marginal over `vanilla-solid`, never over the React
  `vanilla`. Solid tree-shakes per app, so a Solid lane's marginal JS includes the parts of
  `@solidjs/web` only the styling library pulls in — those bytes ship because you use the
  library, which is exactly what the number is for. The HTML number is a different story:
  Solid stamps a unique `_hk` hydration key on every element it may claim, and unique
  strings don't compress, so the Solid lanes' gzipped HTML runs ~2.5–3× the React lanes'.
  That is Solid's cost, identical in both Solid lanes, and it has nothing to do with yak.
- **Interaction.** Solid has no re-render. The React lanes' INP pass forces one with
  `setState` + `flushSync`, so every component re-runs and the styling library recomputes,
  but the props are unchanged and React writes nothing to the DOM. The Solid analogue is a
  value change: every case takes its instance index as an accessor and `__inp` bumps the
  signal behind it, so yak's per-component memo re-runs and the class/style bindings
  update. That means the Solid lanes really do mutate the DOM in that pass and the React
  lanes mostly don't — the two INP columns are not the same workload, and only the
  Solid-vs-Solid gap is a clean read.
- **Hydration bootstrap.** In production Solid ships an inline `<script>` that creates the
  `_$HY` store and starts capturing pre-hydration events. The benchmark's html is component
  markup only, so both Solid lanes run that same bootstrap from the top of their client
  bundle instead — where the shared framework floor cancels it out.

### gen and verify

`gen` runs `verify` automatically at the end (skip with `SKIP_VERIFY=1`). verify proves
the core invariant: for each case, every tech renders an identical DOM (same element
count + tag skeleton, attributes on a whitelist so a leaked `$prop` fails) and identical
pixels, and the hydrate build matches the SSR markup. Static checks always run, the
pixel/hydrate checks reuse the screenshots / `dist/` a full run produced (skipped when absent,
never rebuilt). Diffs land in `result/verify/`

`gen:samples` filters:

```bash
pnpm gen:samples --tech 'next-yak*'          # only matching lane dirnames (glob)
pnpm gen:samples --case 'realistic-button'   # only matching cases (glob)
pnpm gen:samples --measure=microbench,payload  # only these measurements (default = all)
```

The full `pnpm gen` forwards `--tech`/`--case` to **both** generation stages
(`pnpm gen --tech 'next-yak*'`), then stops before `report` — a filtered WPD run leaves the
manifest incomplete and isn't reportable, so re-run a plain `pnpm gen` to publish. `--measure`
(samples-only) and `--lane` (WPD-only) don't apply to the combined run; use the stage directly.

`microbench` + `payload` are fast and deterministic and run by default. The others are
opt-in, run them deliberately and the browser/load ones on an idle machine: `nsweep`
(scaling), `autocannon` (req/s under load), `hydrate`, `inp`, `mount`, and `screenshots`
(browser passes; `screenshots` writes AVIFs to `result/assets/`, named by a hash of their
pixels so lanes that render identically share one file — `avifenc` must be on `PATH`). E.g.
`pnpm gen:samples --measure=nsweep,hydrate`. A filtered or partial-measure run merges into
`result/`, so it won't drop the cells it isn't regenerating. Knobs for the heavy ones
live in `bench.config.ts` (`hydrate`/`inp`/`screenshots` need
`pnpm exec playwright install chromium` once). WPD is isolated from the normal workspace
install: run `pnpm setup:wpd` once, then `pnpm gen:wpd`. The command waits for an idle
machine and runs six separate processes in a fixed order: Node SSR attribution, Chrome
mount/hydration/INP breakdowns, Firefox mount breakdown, and Chrome forced-layout blame.
Raw outputs are committed as `result/measurement-wpd-*.json`. `report` and `verify`
require a complete, exact, zero-failure WPD manifest; filtered WPD runs are diagnostic
and intentionally cannot produce a report

`gen` writes raw samples, never a pre-reduced median, so the statistic is the report's
choice and can change without re-running. History is git, not labeled runs

### Report analysis

The report's prose is a separate, optional layer on top of the numbers, and it is
reproducible:

- `BENCHMARK.json` is the machine-readable report data: per case, per measurement, per
  lane, the same medians the charts draw. Read it directly if you want the numbers without
  the HTML.
- The per-case analyses and the Key-findings panel are written by running
  `scripts/prompts/case-analysis.md` with a strong LLM (Opus) after a full `pnpm gen`. It
  reads `BENCHMARK.json` plus `result/snapshot.json` and writes one JSON per case into
  `result/analysis/`, which `pnpm report` embeds.
- The report renders without them. If `result/analysis/` is empty the charts and tables
  still build; only the written analysis is missing.

## Add a lane (tech)

Create `techs/<name>/`:

1. `package.json`: `name` MUST equal the dirname, `description` is the chart label
   (npm names can't hold spaces or `()`), `"type": "module"`, a `bench` block
   (`color`, `buildPlugin`, `appStylesheet`, `cssKind`, and `framework: "solid"` if the
   lane doesn't render React), your dependencies
2. `vite.microbench.config.ts`: a standalone SSR build → `dist/microbench/entry.mjs`.
   Copy the closest existing lane and swap the `plugins` array (runtime libs: just
   `react()`, build-plugin libs: add `viteYak`/`stylexVite` + `ssrEmitAssets:true`)
3. `ssr-entry.tsx`: export `renderCase(caseId, n): { html, css }` (and `renderHtml` if
   CSS collection is build-time work, e.g. a Tailwind JIT or a sheet slice, so the
   microbench times rendering, not extraction). Discover cases with
   `import.meta.glob("./case/*/index.tsx")`
4. `case/<id>/index.tsx` for each case the lane covers, default-exporting
   `(i) => ReactElement` — or, on a lane whose `bench.framework` is `"solid"`,
   `(i: () => number) => JSX.Element`, taking the index as an accessor so the interaction
   pass can drive it from a signal

No registry edits anywhere. `pnpm lint` then validates the package, `pnpm gen:samples` builds it

## Add a case

1. `cases/<id>.ts`: default-export a `CaseMeta` (`label`, `group`, `n`, `cardinality`,
   `description`). This fixes the workload for every lane
2. Implement `techs/<t>/case/<id>/index.tsx` in each lane it applies to. A lane that
   doesn't do the case simply has no folder, that's how "N/A" is expressed
3. Optionally add it to the report's priority map (`report/priority.ts`) for ordering

## The CSS contract per family

Each lane's `ssr-entry.tsx` collects CSS the way that family does in production:

| family | lanes | how `css` is produced |
|---|---|---|
| author | vanilla, vanilla-solid | the co-located `styles.css`, read `?raw` |
| runtime | styled-components, Emotion, Goober | the lib's SSR critical-CSS API at render time |
| build-extracted | next-yak (×4: styled + css-prop, folding on and off), @yak/solid | the yak sheet emitted via `ssrEmitAssets`, read back |
| build-atomic | StyleX | the stylex plugin's emitted sheet |
| atomic-prebuilt | Panda (css fn / style props) | a `panda cssgen` sheet, sliced to the classes used |
| utility | tailwind-merge, cnfast | real Tailwind JIT over the rendered HTML |

## How the site is published

The raw measurement samples in `result/` are committed, they're the data and their
history is git. The GitHub Actions workflow (`.github/workflows/deploy.yml`) rebuilds the
report from them on every push to `main` and deploys it to GitHub Pages. It never runs
measurements: CI runners are noisy shared machines and the numbers would be wrong in
exactly the way the appendix caveats warn about

That split means:

- report tweak (charts, copy, layout): just push, the site re-renders from the committed
  samples without re-measuring
- new numbers (lane changed, next-yak version bumped, new case): run `pnpm gen` on a quiet
  machine and commit the updated `result/`

`BENCHMARK.html` / `BENCHMARK.md` / `BENCHMARK.zip` are build output and gitignored, the
deployed site is the canonical copy (the zip is downloadable there for offline sharing)

## Contributing

`gen` and `report` import only from inside this repository (the report reads `result/`,
never the lane sources). Every lane is isolated to its own package under `techs/`, so
library authors can tune their lane via a PR that touches only `techs/<their-lib>/`, see
"Add a lane" above. Lane PRs don't need Rust unless they touch the next-yak lanes, and
`pnpm gen:samples --tech '<your-lane>'` only builds your lane
