# CSS-in-JS cost study with wpd 1.3.0

What each styling strategy costs, where, and how far to trust each number, measured
with `@jantimon/web-performance-debugger@1.3.0`. Every figure below is labelled with
the trust tier wpd itself assigns it.

Workload: the `realistic-button` case (a real button with pseudo-states, a responsive
flip, a `::before` tap target, composed fragments, an icon), rendered 1,000x, plus the
`dyn-translate` case (1,000 unique translateX values, the naive dynamic pattern). All
lanes render an identical DOM (the repo's `verify` gate proves it), so differences are
the styling strategy, not the markup.

How to reproduce every number: `scripts/wpd-1.3.0/README.md`.

## Trust tiers (as wpd reports them)

| Signal | Tier wpd assigns | How I read it |
| --- | --- | --- |
| CPU self-time (`--target node`) | real; a few % sampling noise; the node `js` slice is pure JS | trust the ranking and large movers; totals across iterations |
| Allocated bytes (`--target node --alloc`) | per-package shares ~5%; absolute total directional ±10-20% | trust shares/ratios, not the byte total |
| Style / layout slice ms (`--breakdown`) | wall-tier ~1%, directional, reconciles to wall exactly | trust ~2x gaps, not 3-ms ones |
| Counts (layout / style / paint / forced / invalidations) | exact, bit-identical across runs | trust as hard numbers |

CPU and allocation totals are summed across all iterations. Divide by the iteration
count for a per-render figure (250 for `realistic-button`, 200 for `dyn-translate`).

## 1. SSR render cost — Node CPU self-time (highest trust)

`--target node` runs React `renderToString` in-process and attributes self-time to
package by sourcemap. This is the production SSR lane. To keep the comparison fair,
the probe times **render only**: lanes whose CSS is a separate build step (Tailwind
JIT, an atomic sheet slice) expose `renderHtml`, which renders markup without producing
the CSS; runtime CSS-in-JS lanes inject CSS as a render byproduct, so their render
inherently includes it.

`realistic-button`, 1,000 instances, 250 iterations, render-only:

| Rank | Lane | JS self-time (250 iters) | ~per render | Dominant package |
| --- | --- | --- | --- | --- |
| 1 | stylex | 275 ms | 1.1 ms | react-dom 211 · stylex 59 |
| 2 | next-yak-9.7 (folded) | 276 ms | 1.1 ms | react-dom 215 · next-yak 57 |
| 3 | next-yak-css-9.7 (folded) | 281 ms | 1.1 ms | react-dom 219 · next-yak 59 |
| 4 | **vanilla (floor)** | 308 ms | 1.2 ms | react-dom 245 · vanilla 60 |
| 5 | next-yak-css (9.6, runtime) | 339 ms | 1.4 ms | react-dom 207 · next-yak 88 · unmapped 39 |
| 6 | cnfast | 485 ms | 1.9 ms | react-dom 411 · cnfast 68 |
| 7 | next-yak (9.6, runtime) | 592 ms | 2.4 ms | react-dom 241 · unmapped-runtime 206 · next-yak 114 |
| 8 | tailwind-merge | 793 ms | 3.2 ms | tailwind-merge 409 · react-dom 372 |
| 9 | panda | 866 ms | 3.5 ms | react-dom 793 · panda 66 |
| 10 | styled-components | 1,275 ms | 5.1 ms | styled-components 954 · react-dom 280 |
| 11 | goober | 1,320 ms | 5.3 ms | goober 980 · react-dom 282 |
| 12 | emotion | 1,832 ms | 7.3 ms | @emotion/hash 841 · react-dom 346 · @emotion/styled 242 |
| 13 | panda-props | 12,140 ms | 48.6 ms | panda-props 11,125 · react-dom 979 |

`panda-recipe` has no `realistic-button` folder, so it is a true N/A (the repo expresses
"lane does not do this case" as a missing folder). wpd surfaced our probe's own thrown
error clearly.

Findings:

- **Build-time and folded lanes sit at the vanilla floor.** StyleX and next-yak 9.7
  (which folds static styles at build time) add essentially nothing to SSR render:
  their runtime is ~60 ms over 250 renders, the same as vanilla's own component code.
  next-yak 9.6 and 9.7-nofold keep a runtime path and cost ~2x the floor.
- **Cost moves to a different package by family.** Runtime CSS-in-JS spends it in the
  styling library: styled-components in `generateAndInjectStyles` (632 ms of the 954 ms
  on its own line, per `query cpu --by function`), goober in its render, emotion split
  across `@emotion/hash` (841 ms, the single hottest package), `@emotion/styled`, and
  `@emotion/serialize`. Atomic and utility families (panda, tailwind-merge, cnfast)
  keep their own runtime cheap but push cost **into react-dom**, which grows because
  each element carries a long `className` string to serialize (panda's react-dom is
  793 ms vs vanilla's 245 ms).
- **panda-props is in its own class.** Resolving style props per render costs 48 ms
  per render, ~40x the vanilla floor. Its own package is 92% of the self-time.
- **The hottest actionable line, per lane** (`query cpu --by function`): styled-components
  `generateAndInjectStyles`, emotion `@emotion/hash`. These are library-internal, so
  the action is a library/config choice, not a code edit. (The libs are bundled and
  minified to one line by the lane's Vite build, so within-library line granularity
  collapses to `:1`; per-package attribution is unaffected — see feedback.)

### Naive dynamic values punish runtime CSS-in-JS

`dyn-translate` (1,000 unique translateX values, the naive per-value pattern), 200
iterations, render-only, top movers:

| Lane | JS self-time (200 iters) | Dominant package |
| --- | --- | --- |
| next-yak-css-9.7 / vanilla / stylex | 116-167 ms | at the floor |
| styled-components | 848 ms | **styled-components 439 · stylis 323** |
| emotion | 580 ms | emotion 155 · @emotion/styled 123 · @emotion/hash 67 |
| panda | 815 ms | panda 727 |
| goober | 1,220 ms | goober 1,080 |
| panda-props | 1,213 ms | panda-props 1,099 |

With a unique value per instance the runtime libs mint a class per value and re-run
their CSS parser each time. wpd names the culprit precisely: for styled-components,
**`stylis` jumps to 323 ms (38% of the render)** — the CSS parse/serialize per value —
a cost that is near zero on the low-cardinality `realistic-button`. Build-time and
folded lanes are flat, because a static value compiles away.

## 2. Allocation — which library allocates (`--target node --alloc`)

Same `realistic-button` workload, 250 iterations. Shares are the trustworthy signal
(~5%); the absolute byte totals are directional.

| Lane | Allocated (250 iters) | Dominant package |
| --- | --- | --- |
| next-yak-9.7 (folded) | 821 MB | react-dom 84% |
| stylex | 862 MB | react-dom 81% · stylex 18% |
| tailwind-merge | 900 MB | react-dom 81% · tailwind-merge 10% |
| vanilla (floor) | 962 MB | react-dom 86% |
| goober | 1,361 MB | react-dom 53% · **goober 44%** |
| styled-components | 1,639 MB | **styled-components 50%** · react-dom 45% |
| emotion | 1,881 MB | react-dom 45% · (native) 23% |
| panda-props | 25,537 MB | **panda-props 59% · (native) 37%** |

Allocation is flatter than CPU and mostly react-dom's element/string churn — except
the runtime libs. styled-components allocates as much as react-dom itself; goober's
own package is 44% of its allocation despite being a tiny library. panda-props
allocates ~25 GB across 250 renders, a third of it in the V8 `(native)` bucket (GC and
engine work wpd cannot pin to a JS package). Allocation and CPU do not always agree:
tailwind-merge is a heavy CPU lane but a light allocator, so a CPU profile alone would
mislead on which library to blame for GC pressure.

## 3. Browser render work — style recalc and layout (`--breakdown`)

Each lane's emitted markup+CSS injected into real Chrome, then a forced style-recalc +
layout flush, 10 iterations. Same DOM every lane, so the browser cost isolates the CSS
strategy. Counts are exact; slice ms is wall-tier directional.

| Lane | style ms | layout ms | style/layout counts | emitted HTML |
| --- | --- | --- | --- | --- |
| styled-components / goober / emotion / vanilla | ~35 | ~62 | 10 / 10 (identical) | 147-177 KB |
| tailwind-merge | 44 | 51 | 10 / 10 | 864 KB |
| panda | 53 | 65 | 10 / 10 | 1,304 KB |
| **stylex** | **70** | 50 | 10 / 10 | 533 KB |

**The browser side inverts the SSR ranking.** StyleX and next-yak-9.7 are the cheapest
to render on the server, but StyleX's atomic CSS is the **most expensive for the browser
to match** — 70 ms style recalc vs ~35 ms for the others, ~2x. The flush **counts are
identical (10 each)**, so this is pure per-element selector-matching cost, not extra
work: each element carries many atomic classes the engine must resolve. Atomic styling
also emits far more markup (panda 1.3 MB, tailwind 864 KB vs vanilla 177 KB) — a wire
and parse cost the payload measurement, not this one, prices. The lesson wpd makes
visible: SSR-cheap is not the same as browser-cheap; you have to measure both ends.

`query span run` also reports per-flush scope: StyleX relaid 5,503 render-tree objects
and styled 2,500 elements per flush — the same DOM every lane, confirming the ms gap is
matching cost, not tree size.

## 4. Forced layout, thrash, and the two-question run group

Recording the StyleX inject probe as a run group (`--members breakdown,deep`) stitches
one view: the bar and CPU from the breakdown member, exact counts and forced-layout
blame from the deep member, walls kept per member (never averaged). It reported:

- forced layout/style **10** (exact), layout invalidations **55,005**, style
  invalidations **5,000**.
- `query blame --forced` pinned every forced flush to the exact read line
  (`inject/stylex.mjs:12` — `void document.body.offsetHeight`) with the dirtied-by
  write named underneath (`:11`, the `innerHTML` set). Read site and write site, both
  to a source line.

Here the forced layout is attributed to the probe (I wrote the forcing read), which
demonstrates the mechanism end-to-end. To attribute a forced layout to a **library**
you would drive the library's own client code that reads geometry; the same blame
machinery applies.

## Comparison verbs and gates (do they behave sensibly?)

- **`cpu-diff` (vanilla vs styled-components):** clean per-package and per-function
  deltas — `styled-components +954 ms`, `generateAndInjectStyles +632 ms`,
  `vanilla -60 ms`. Exactly the actionable delta.
- **`assert --max-forced 0` on a `--breakdown` recording:** loud `n/a` FAIL —
  "forced layout/style was not measured; cannot satisfy max 0" — exit 1. It refuses to
  read a not-measured metric as a clean 0.
- **`cpu-diff` across capture modes (cpu vs alloc):** refuses — "no CPU model ... nothing
  to cpu-diff" — exit 1.
- **`diff --fail-on-regression` across two different inject modules:** detects the
  workload mismatch, prints the diff as directional, and refuses to gate — exit 1. A
  refusal is a hard non-zero, so a CI gate that cannot be evaluated goes red, never a
  silent green.

One sharp edge worth stating for anyone reusing the node harness: the node CPU
recordings all share **one module path** (`ssr-node.mjs`, lane switched by an env var),
so wpd sees them as the **same workload** and will `cpu-diff` any two without refusing
— the env-driven difference is invisible to it. That is the right call to make with
`--variant <label>`; label each lane's recording and a cross-variant gate refuses. The
browser probes use a separate file per lane, so there the mismatch is caught
automatically (see the `diff` refusal above). Same tool, two harness shapes, two
comparability outcomes — by design.
