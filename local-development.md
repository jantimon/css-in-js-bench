# Local development

How to set up the repo, run the benchmark, and add a lane or a case.

## Prerequisites

- Node 24 or newer
- pnpm 11.9.0, the version in `packageManager` (`corepack enable` picks it up)
- Chromium through Playwright, for the browser measurements and screenshots
- `avifenc` (libavif) on `PATH`, for screenshots

## Setup

```bash
pnpm install
pnpm exec playwright install chromium   # run again after every @playwright/test update
pnpm setup:wpd                          # pinned WPD with its Chrome and Firefox, into vendor/wpd
```

To see the report from the committed results, run `pnpm report` and open `BENCHMARK.html`.
This needs no measuring.

## Folder layout

| Path | What it holds |
| --- | --- |
| `cases/<id>.ts` | one workload: label, group, instance count `n`, cardinality, description |
| `techs/<lane>/` | one lane: its own package with its own dependencies and build config |
| `techs/<lane>/case/<id>/index.tsx` | one cell: this lane's code for this case |
| `result/` | raw measurement samples, snapshots and screenshots |
| `report/`, `report.tsx` | turns `result/` into the report |
| `gen.ts`, `scripts/` | the measurement runners |
| `verify.ts` | the parity gate |
| `bench.config.ts` | sample counts and settings for each measurement |

There is no central registry. A lane exists because its folder exists. A cell exists
because `techs/<tech>/case/<case>/index.tsx` exists.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm gen:samples` | measures lanes and cases, writes `result/`, then runs verify |
| `pnpm gen:wpd` | runs the WPD profiles: SSR, mount, hydrate, INP, Firefox |
| `pnpm build` | the full pipeline: clean, samples, backfill, wpd, verify, report |
| `pnpm verify` | checks that every lane renders the same DOM and pixels |
| `pnpm report` | writes `BENCHMARK.html`, `BENCHMARK.md`, `BENCHMARK.json` and `BENCHMARK.zip` |
| `pnpm lint` | validates each lane's `package.json` and case folders |
| `pnpm test:http` | tests the HTTP throughput runner |
| `pnpm test:wpd` | tests WPD result handling |
| `pnpm test:interaction` | tests the interaction pass in Chromium |
| `pnpm test:browser` | tests CSS emission and styled pages in the browser |

The tests write no measurement files. Set `BROWSER_STYLES_CASES=all` to make
`pnpm test:browser` check every case.

## Measuring

`pnpm gen:samples` takes these flags:

| Flag | Effect |
| --- | --- |
| `--tech <glob>` | only lanes whose folder name matches, for example `'yak-react*'` |
| `--case <glob>` | only matching cases |
| `--measure=<list>` | only these measurements, comma separated |
| `--resume-http` | resume an interrupted `autocannon` pass (with `--measure=autocannon` only) |

Without `--measure` it runs `microbench` (SSR render throughput) and `payload` (page
bytes). Both are fast and stable. The other measurements are opt-in:

| `--measure` | Report section | Note |
| --- | --- | --- |
| `microbench` | SSR render throughput | default |
| `payload` | page bytes | default |
| `nsweep` | scaling | |
| `autocannon` | SSR throughput under load | runs only without `--tech` and `--case` |
| `hydrate` | client hydration | browser |
| `inp` | interaction update | browser |
| `mount` | cold mount | browser |
| `screenshots` | preview images, pixel gate | browser, needs `avifenc` |
| `buildtime` | build time | slow |

Results merge per cell, so a filtered run replaces only the cells it measures. Examples:

```bash
pnpm gen:samples --tech 'yak-react*'
pnpm gen:samples --case realistic-button --measure=microbench,payload
pnpm gen:samples --measure=autocannon --resume-http
```

Browser and server measurements depend on the machine. Run them on an idle machine.
`gen:samples` runs verify at the end; set `SKIP_VERIFY=1` to skip it.

`pnpm gen:wpd` also takes `--tech` and `--case`. `report` and `verify` need a complete WPD
run with no failures, so after a filtered run use `pnpm build --from wpd`.

## Full build

`pnpm build` measures every lane and case and then writes the report. It takes several
hours. Start it detached and follow the log:

```bash
nohup caffeinate -is pnpm build > /dev/null 2>&1 &
tail -f .build/build.log
```

| Command | Effect |
| --- | --- |
| `pnpm build` | continues from the first unfinished stage |
| `pnpm build --status` | prints stage timings and skipped or re-measured cells |
| `pnpm build --from <stage>` | redoes that stage and every later one |
| `pnpm build --fresh` | starts over |

## Verify and the pixel gate

`pnpm verify` checks, for each case:

1. every element carries only allowed attributes, so a leaked prop fails
2. every lane renders the same element count and tag structure
3. every lane's screenshot matches the reference lane (styled-components) pixel for pixel
4. the CSS styles the SSR markup before JavaScript, and hydration, updates and cold mounts
   keep the same styles

Checks 3 and 4 reuse existing screenshots and `dist/` builds and skip when those are
missing. Diffs go to `result/verify/`.

The committed screenshots come from the Linux CI machine, and macOS renders differ from
them. To check a CSS change locally, screenshot the reference lane first, then the lanes
you changed:

```bash
pnpm gen:samples --measure=screenshots --tech styled-components
pnpm gen:samples --measure=screenshots --tech <your-lane>
```

## Add a lane

Copy the closest existing lane in `techs/` and change it:

- `package.json`: `name` equals the folder name. `description` is the chart label.
  Set `"type": "module"` and a `bench` block with `color`, `buildPlugin`, `appStylesheet`,
  `cssKind`, and `framework: "solid"` for a Solid lane. List your own dependencies.
- `vite.microbench.config.ts`: the SSR build, output to `dist/microbench/entry.mjs`
- `vite.hydrate.config.ts` and `client-entry.tsx`: the browser build
- `ssr-entry.tsx`: exports `renderCase(caseId, n)` returning `{ html, css }`. Export
  `renderHtml` as well when collecting CSS is build-time work, so SSR render throughput
  times rendering only.
- `case/<id>/index.tsx` for each case the lane covers. It default-exports
  `(i) => ReactElement`, or `(i: () => number) => JSX.Element` on a Solid lane.

Then run `pnpm lint` and `pnpm gen:samples --tech '<your-lane>'`. A lane pull request
touches only `techs/<your-lane>/`.

How each family produces its CSS:

| `cssKind` | Lanes | Where the CSS comes from |
| --- | --- | --- |
| `none` | vanilla, vanilla-solid | a hand-written `styles.css` |
| `runtime` | styled-components, Emotion, Goober | the library's SSR API at render time |
| `extracted` | @yak/react, @yak/solid | the sheet the yak build emits |
| `atomic` | StyleX, Panda, Bamboo, Plumeria | the sheet the build or codegen emits |
| `utility` | cn, cn-solid, tailwind-merge | Tailwind run over the rendered HTML |

## Add a case

1. Create `cases/<id>.ts` that default-exports a `CaseMeta`: `label`, `group`, `n`,
   `cardinality` and `description`. This fixes the workload for every lane. A lane may not
   change `n`.
2. Add `techs/<lane>/case/<id>/index.tsx` to each lane that covers it.
3. Optional: set the case's order in `report/priority.ts`.

## When a lane cannot do a case

A lane with no folder for a case is simply absent from it. When a lane's own primitive
cannot express the case, write `techs/<lane>/case/<id>/not-compatible.md` in place of
`index.tsx`. Examples: a build-time scanner and a value that exists only at render, or a
css prop that cannot extend a component. A fix that works only through the harness, such
as safelisting every value, does not count. Put the lane's working path in the matching
"best practice" case instead (`dyn-fair` for dynamic values).

The note:

- two to four sentences, present tense, saying why the primitive cannot do it
- a source: a link to the library's docs, or to the author's own words in an issue
- paragraphs, `- ` lists, `> ` quotes, `[text](url)` links and backticks render

Never write a note for a control case or a scope choice. `pnpm lint` fails when a case
folder has both files, neither, or an empty note. The report shows the lane struck through
with the note as its one tab.

To turn an existing cell into a note, delete the `index.tsx` and remove the cell's key
(`<case>/<lane>`) from every `result/measurement-*.json` and `result/snapshot.json`. Then
set `expectedCells` and each lane's `run` and `ok` in `result/measurement-wpd-tally.json`
to the remaining cell count. A full run merges into the result files, so it keeps a
removed cell otherwise.

## Results and CI

`result/` holds raw samples, never medians, so the report picks the statistic. Git keeps
the history.

Do not commit `result/` by hand. Two workflows handle it:

- `.github/workflows/benchmark.yml` runs `pnpm build --fresh` on a dedicated machine each
  day, when `main` has changes outside `result/` since the last benchmark. It commits
  `result/` to `main` and starts a deploy. A manual run can filter by lane or case;
  filtered runs are never committed.
- `.github/workflows/deploy.yml` runs `pnpm report` on every push to `main` and publishes
  the report to GitHub Pages. It never measures.

So a report change (charts, text, layout) needs only a push. A lane or case change gets
new numbers from the next benchmark run. After a local run, restore `result/` with
`git checkout result/` and `git clean -f result/` before you commit.

## Report analysis

The written analysis in the report is optional. Run `scripts/prompts/case-analysis.md`
with an LLM after a full build. It reads `BENCHMARK.json` and `result/snapshot.json` and
writes one JSON per case into `result/analysis/`, which `pnpm report` embeds. Without it,
the charts and tables still build.
