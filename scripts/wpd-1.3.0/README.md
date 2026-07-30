# wpd 1.3.0 study — how to reproduce

Measurement harness for `wpd-study-1.3.0.md`, driven entirely by
`@jantimon/web-performance-debugger@1.3.0` (a devDependency of this repo).

All raw recordings land in `.wpd-runs/` (gitignored, multi-MB). Only these scripts and
the two study `.md` files are committed.

## Prerequisites

```bash
pnpm install
pnpm add -D @jantimon/web-performance-debugger@1.3.0   # already in package.json
```

Every lane must be built first (the harness reads `techs/<lane>/dist/microbench/entry.mjs`):

```bash
pnpm gen:samples --measure=microbench    # builds each lane's SSR entry + sourcemap
```

The node lane needs **no browser**. The browser sweep needs the Chrome that wpd's
puppeteer pins; under pnpm approve its build (`pnpm-workspace.yaml` → `allowBuilds:
puppeteer: true`) or point `PUPPETEER_EXECUTABLE_PATH` at a compatible Chrome.

## Measurement etiquette

One measurement at a time on the host. Every runner claims `/tmp/wpd-gate-lock` before
each `record` and releases it after, waiting in a bounded foreground loop if another
run holds it. Do not run two sweeps at once.

## The scripts

| File | What it does |
| --- | --- |
| `ssr-node.mjs` | wpd `--target node` module. Renders one lane+case's workload (`WPD_LANE`/`WPD_CASE`/`WPD_N`). Prefers `renderHtml` (render only) so CSS extraction stays out of the timed window; set `WPD_FORCE_RENDERCASE=1` to time render + CSS production. |
| `run-node.sh` | Sweeps the node lane over every built tech for one case, cpu or alloc. |
| `gen-inject.mjs` | Generates a `--bench` probe per lane that injects that lane's SSR markup+CSS into the DOM and forces a style-recalc + layout flush. |
| `run-browser.sh` | Sweeps the browser `--breakdown` over the inject probes. |
| `extract-cpu.mjs` / `extract-alloc.mjs` / `extract-browser.mjs` | Rank a sweep's recordings from `wpd query cpu\|alloc\|spans --format json`. |

## Reproduce each section of the study

```bash
# 1. SSR CPU self-time, render-only (Study §1)
bash scripts/wpd-1.3.0/run-node.sh realistic-button cpu 250
node scripts/wpd-1.3.0/extract-cpu.mjs .wpd-runs/cpu/realistic-button

#    naive dynamic values (Study §1, dynamic)
bash scripts/wpd-1.3.0/run-node.sh dyn-translate cpu 200
node scripts/wpd-1.3.0/extract-cpu.mjs .wpd-runs/cpu/dyn-translate

# 2. Allocation (Study §2)
bash scripts/wpd-1.3.0/run-node.sh realistic-button alloc 250
node scripts/wpd-1.3.0/extract-alloc.mjs .wpd-runs/alloc/realistic-button

# 3. Browser style-recalc + layout (Study §3)
node scripts/wpd-1.3.0/gen-inject.mjs vanilla styled-components emotion goober stylex tailwind-merge panda
bash scripts/wpd-1.3.0/run-browser.sh 10
node scripts/wpd-1.3.0/extract-browser.mjs .wpd-runs/browser/realistic-button

# 4. Two-question run group + forced-layout blame (Study §4)
node "$WPD" record .wpd-runs/inject/stylex.mjs --bench --members breakdown,deep --group perf --iterations 5 --warmup 2
node "$WPD" query span latest run          # stitched: bar from breakdown, counts+forced from deep
node "$WPD" query blame latest --forced

# where WPD is the direct bin (pnpm exec is blocked by the ignored puppeteer build):
#   WPD="node_modules/.pnpm/@jantimon+web-performance-debugger@1.3.0/node_modules/@jantimon/web-performance-debugger/dist/cli.js"
```

## Fairness notes

- **`renderHtml` vs `renderCase`.** Build-time-CSS lanes (Tailwind JIT, atomic sheet
  slice) produce CSS in a step separate from render, so timing `renderHtml` (markup
  only) is the fair render-cost comparison against runtime lanes, whose CSS is a render
  byproduct. Timing `renderCase` for a JIT lane times the CSS compiler and shows a huge
  `(native)` share — a different (also valid) question. `ssr-node.mjs` prefers
  `renderHtml` for exactly this reason.
- **`--variant`.** The node recordings share one module path (lane switched by an env
  var), so wpd treats any two as the same workload and will `cpu-diff` them without a
  comparability refusal. Add `--variant <lane>` to a `record` if you want a
  cross-variant gate to refuse.
