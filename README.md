# CSS-in-JS benchmarks

**Live report: <https://jantimon.github.io/css-in-js-bench/>**

A neutral, reproducible comparison of CSS-in-JS / utility styling strategies for React,
measured on identical workloads. Every strategy ("lane") renders the **same** components
under the **same** conditions, so the numbers are comparable by construction.

The headline question: for a real component, what does each approach cost at SSR — in
render time and in bytes shipped — and what markup + CSS does it actually emit?

## Philosophy

Two values shape everything here:

- **Fairness.** The workload is defined once, in `cases/`, and applied to every lane. A
  case fixes the instance count (`n`) and the cardinality; a lane may never change them.
  So when StyleX beats styled-components, it's on the *same* 1,000 buttons.
- **Isolation.** Each lane is its own package under `techs/<lane>/` with its own
  `package.json`, its own declared dependencies, and its own build config. A
  styled-components lane physically cannot import goober or a stray React copy — it only
  sees what it declares. The comparison is honest because the boundaries are real.

There is **no central registry**. A lane exists because its folder exists; a
`(case, tech)` cell is measured because `techs/<tech>/case/<case>/index.tsx` exists. The
filesystem *is* the source of truth — adding a lane or a case is a folder, never an edit
to a shared list.

## How to read `BENCHMARK.html`

For each case you get:

- **SSR render throughput** (renders/sec, higher better) — the production SSR work only.
  For runtime libraries this includes their style injection; for build-time libraries it's
  the class-name generation. The CSS *collection* for the report is **not** timed here.
- **Page bytes shipped** (JS + CSS + HTML, gzipped, lower better) — what the page costs on
  the wire. Runtime libs ship the critical CSS they injected; atomic/extracted libs ship the
  slice of their build-time sheet the page used. **JS** is the lane's *marginal* client
  bundle over the bare-React floor (gzipped `hydrate` build minus vanilla's) — its runtime
  footprint, so it's the same for every case of a lane.
- **SSR throughput under load** (requests/sec, higher better) — a real HTTP server renders
  the page per request while autocannon hammers it. Heavy + machine-dependent.
- **Where the SSR render time goes** (CPU attribution) — the median render split into
  react-dom (the floor every lane shares) vs the styling library's own runtime vs your
  component, profiled in real node V8 and mapped back to each package via the bundle
  sourcemap. This is *why* a throughput number looks the way it does.
- **Client hydration time** (ms, lower better) — Playwright loads the SSR markup + a
  per-tech browser build that `hydrateRoot`s it, and times the hydration commit.
- **Where the client hydration time goes** (CPU attribution) — the same react / styling-lib /
  your-component split as the SSR attribution, but profiled in the *browser* over exactly the
  hydration commit (CDP Profiler + source maps; hydration is deferred behind `?manual=1` so the
  samples are clean). Build-time lanes show ~zero styling-lib cost; runtime CSS-in-JS shows its
  client runtime as a real segment.
- **Interaction → next paint** (ms, lower better) — a `flushSync` re-render of the mounted
  workload in place, then a wait for paint; the per-element runtime cost a user actually feels.
- **Where the interaction time goes** (CPU attribution) — that re-render, split per package in
  the browser. This is where runtime libraries re-run their styling on every update.
- **Where the cold-mount time goes** (CPU attribution) — starting from a *blank* root (no SSR
  markup), a "click" renders the whole workload from scratch (`createRoot().render()`), then we
  wait for the first paint, split per package in the browser. Unlike hydration (which attaches
  to existing server HTML) this is a cold client mount, so the first paint includes each runtime
  library's *first style injection* into the document — the build-time lanes inject nothing.
- **Scaling** (render time vs instance count) — the nsweep: how each lane's render time
  grows with n (= distinct values for dynamic cases). Flat for build-time CSS, steep for
  runtime-per-value libs — the crossover story.
Each case **leads** with its source + preview (the input), then the performance charts (the
result):

- **Source · generated HTML · generated CSS · rendered preview** — a simplified code-editor
  view: a left sidebar lists every lane (the "file list"), top tabs switch between
  **index.tsx** (the *verbatim* benchmarked source — no second copy), **output.html**,
  **output.css** (what that lane actually emitted — class soup vs one hashed class vs
  inline-style vars; atomic utilities vs one extracted rule vs a runtime `<style>`), and
  **preview** (that lane's rendered screenshot). The generated HTML/CSS are Prettier-formatted
  *for reading*; the **byte sizes** in each file's status bar (and the CSS **class count /
  shortest+longest class name**) are measured on the RAW emitted output, not the prettified
  display. Since every lane renders identically (visual parity), the preview is the same image
  for all of them — the highlighted lane name is what tells you which one you're viewing.

Every lane is built in **production mode** (React's prod runtime) so the comparison is
max-performance. `next-yak (released)` benches the published npm version alongside the
local source lane, so you can see what a given change buys.

The report is `BENCHMARK.html` plus a sibling `assets/` folder: screenshots (PNG) and the
editor's highlighted code files (`assets/code/<case>__<tech>__<art>.html`, Shiki at build
time → zero runtime JS for highlighting). The editor loads one file at a time via an
`<iframe>` (keeps the main HTML small, works from `file://`). `report` also bundles the html +
assets into **`BENCHMARK.zip`** so the whole thing can be sent as one self-contained file.
Charts and section toggles are progressive-enhancement only (no hydration), but they *react*
to the lane filter — bar widths and the scaling chart's axis rescale to the visible lanes; the
code editor needs JS to switch files (the first file shows without it).

Some measurements are machine-dependent and noisy (anything that boots a browser or a
server). Those carry that caveat in the report and live in a collapsible appendix.

## Running it

```bash
pnpm setup:yak  # vendor next-yak from source: clone + build js + swc wasm (see below)
pnpm install
pnpm gen        # build every lane in isolation, write raw samples → result/ (then verifies)
pnpm report     # reduce samples → BENCHMARK.html + BENCHMARK.md (+ BENCHMARK.zip to share)
pnpm verify     # parity gate: every lane renders the same DOM + pixels (gen runs this too)
pnpm lint       # validate every tech package's schema
pnpm dev        # author a single cell with HMR
```

### The next-yak source lanes

The `next-yak` and `next-yak (css prop)` lanes bench the library **built from source**, not
a published version (that's what the `next-yak (released)` lane is for). `pnpm setup:yak`
clones <https://github.com/jantimon/next-yak> at the commit pinned in `next-yak.ref` into
`vendor/next-yak/` and builds it fresh — the JS package and the SWC plugin (Rust → wasm).
The lanes link against that clone (`link:../../vendor/next-yak/packages/next-yak`), so
`setup:yak` must run **before** `pnpm install`.

Building needs the Rust toolchain (rust-lang.org) with the wasm target:

```bash
rustup target add wasm32-wasip1
```

`next-yak.ref` holds either a **commit SHA** (pinned and reproducible — the mode the
committed numbers in `result/` correspond to) or a **branch name** for performance
experiments, e.g. `perf-styled-jsx-folding`. There is no `git pull`: a pinned SHA is
never updated; a branch ref re-fetches its tip on every `pnpm setup:yak` run. To bench a
different next-yak, edit `next-yak.ref` and re-run `pnpm setup:yak` — the clone is reused,
so the Rust build cache survives switching refs.

If you only want to work on the report (`pnpm report` reads committed samples from
`result/`), `node scripts/setup-next-yak.mjs --skip-build` is enough — no Rust required.

`gen` runs `verify` automatically at the end (skip with `SKIP_VERIFY=1`). verify proves the
core invariant — for each case, every tech renders an identical DOM (same element count + tag
skeleton, attributes on a whitelist so a leaked `$prop` fails) and identical pixels, and the
hydrate build matches the SSR markup. Static checks always run; the pixel/hydrate checks reuse
the PNGs / `dist/` a full run produced (skipped, never rebuilt, when absent). Diffs land in
`result/verify/`.

`gen` filters:

```bash
pnpm gen --tech 'next-yak*'          # only matching lane dirnames (glob)
pnpm gen --case 'realistic-button'   # only matching cases (glob)
pnpm gen --measure=microbench,payload  # only these measurements (default = all)
```

Measurements: `microbench` + `payload` are fast/deterministic and run by default. The
others are **opt-in** (run them deliberately, the browser/load ones on an idle machine):
`nsweep` (scaling), `autocannon` (req/s under load), `attribution` (SSR CPU split),
`hydrate` + `hydrate-attribution` + `inp` + `inp-attribution` + `mount` + `mount-attribution` +
`screenshots` (Playwright browser passes — `screenshots` writes PNGs to `result/assets/`).
E.g. `pnpm gen --measure=attribution,nsweep`.
A filtered/partial-measure run merges into `result/`, so it won't drop the cells it isn't
regenerating. Knobs for the heavy ones live in `bench.config.ts`. (`hydrate`/`inp`/`screenshots` need
`pnpm exec playwright install chromium` once.)

`gen` writes **raw samples** (never a pre-reduced median) so the statistic is the report's
choice and can change without re-running. A full run starts clean; a filtered run merges
into the existing `result/` so it can't drop the cells it isn't regenerating. History is
git, not labeled runs.

## Add a lane (tech)

Create `techs/<name>/`:

1. `package.json` — `name` MUST equal the dirname; `description` is the chart label
   (npm names can't hold spaces or `()`); `"type": "module"`; a `bench` block
   (`color`, `buildPlugin`, `appStylesheet`, `cssKind`); your dependencies.
2. `vite.microbench.config.ts` — a standalone SSR build → `dist/microbench/entry.mjs`.
   Copy the closest existing lane and swap the `plugins` array. (Runtime libs: just
   `react()`. Build-plugin libs: add `viteYak`/`stylexVite` + `ssrEmitAssets:true`.)
3. `ssr-entry.tsx` — export `renderCase(caseId, n): { html, css }` (and `renderHtml` if
   CSS collection is build-time work, e.g. a Tailwind JIT or a sheet slice — so the
   microbench times rendering, not extraction). Discover cases with
   `import.meta.glob("./case/*/index.tsx")`.
4. `case/<id>/index.tsx` for each case the lane covers — default-export `(i) => ReactElement`.

No registry edits anywhere. `pnpm lint` then validates the package; `pnpm gen` builds it.

## Add a case

1. `cases/<id>.ts` — default-export a `CaseMeta` (`label`, `group`, `n`, `cardinality`,
   `description`). This fixes the workload for **every** lane.
2. Implement `techs/<t>/case/<id>/index.tsx` in each lane it applies to. A lane that
   doesn't do the case simply has no folder — that's how "N/A" is expressed.
3. Optionally add it to the report's priority map (`report/priority.ts`) for ordering.

## The CSS contract per family

Each lane's `ssr-entry.tsx` collects CSS the way that family does in production:

| family | lanes | how `css` is produced |
|---|---|---|
| author | vanilla | the co-located `styles.css`, read `?raw` |
| runtime | styled-components, Emotion, Goober | the lib's SSR critical-CSS API at render time |
| build-extracted | next-yak (×2) | the viteYak sheet emitted via `ssrEmitAssets`, read back |
| build-atomic | StyleX | the stylex plugin's emitted sheet |
| atomic-prebuilt | Panda (css fn / style props) | a `panda cssgen` sheet, sliced to the classes used |
| utility | tailwind-merge, cnfast | real Tailwind JIT over the rendered HTML |

## How the site is published

The raw measurement samples in `result/` are **committed** — they're the data, and their
history is git. The GitHub Actions workflow (`.github/workflows/deploy.yml`) rebuilds the
report from them on every push to `main` and deploys it to GitHub Pages. It never runs
measurements: CI runners are noisy shared machines, so the numbers would be wrong in
exactly the way the appendix caveats warn about.

That split means:

- **Report tweak** (charts, copy, layout): just push — the site re-renders from the
  committed samples, no re-measuring.
- **New numbers** (lane changed, next-yak ref bumped, new case): run `pnpm gen` on a
  controlled, idle machine and commit the updated `result/`.

`BENCHMARK.html` / `BENCHMARK.md` / `BENCHMARK.zip` are build output and gitignored — the
deployed site is the canonical copy (the zip is downloadable there for offline sharing).

## Contributing

`gen` and `report` import only from inside this repository (the report reads `result/`,
never the lane sources). Every lane is isolated to its own package under `techs/`, so
external library authors can tune *their* lane via a PR that touches only
`techs/<their-lib>/` — see "Add a lane" above. Lane PRs don't need Rust unless they touch
the next-yak lanes: `pnpm gen --tech '<your-lane>'` only builds your lane.
