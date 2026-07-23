# CPU hotspots — function-level SSR deep dive

Package-level attribution (`result/measurement-wpd-ssr.json` `byPackage`, `ROUND1/ROUND2.md`)
already tells us a styling library costs *N* milliseconds. This dive names the functions inside
that slice: which sourcemap-resolved function burns the time, what it does per component instance,
and which single function is the lever.

## Method

Fresh recordings — the `gen-wpd` run wipes its temp tree (`gen-wpd.ts:563`), so nothing was
retained. Each cell was re-recorded from the retained lane dist builds (`techs/*/dist/microbench/entry.mjs`)
through the same Node SSR entry the pipeline uses (`scripts/wpd/node-ssr-entry.mjs`,
`wpd record --target node --iterations 30 --warmup 5`), then read back with
`wpd query cpu --by function` and `wpd query frame`. Workload `n = 1000` per cell, matching the cases.

Reading the numbers:

- Self-time is sampled (200 µs) and summed over the 30-iteration window. Tables show **self per
  instance-render** = window self ÷ 30.
- The `post (node:inspector)` frame is the sampler's own cost (~1.1–1.3 ms/render, roughly constant
  across techs). It is **excluded** from every table and every "lib slice" figure below.
- Absolute per-render ms carry sampling inflation (the summed window slightly overcounts against the
  clean wall median). The **robust signals are the ratios**: a function's share of the lib slice, and
  the same function across techs. Wall medians anchor each section loosely.
- **Lib slice** per tech = the styling library's own packages, *excluding* the shared bench harness
  (`techs/<tech>/ssr-entry.tsx`, ~0.1–0.2 ms/render everywhere) and React. For next-yak the pure
  runtime shows up under `(unmapped: runtime)` (the Babel-injected `styled.tsx`, inlined so it maps to
  no npm name) plus `useTheme` from `next-yak/dist`.

Scope: SSR Node profile (the stated priority) for all requested cells. Browser mount/INP was left for
a follow-up; the SSR hot path already isolates every mechanism the question asks about.

---

## realistic-button — a real button, depth 1, 1000×

The wall medians line up with how much each does at render time: emotion (7.41 ms) and
styled-components (5.64 ms) lead because they hash and inject a class per render, the yak runtimes sit
mid-pack (2.39–2.53 ms) doing bookkeeping but no string work, and the build-time approaches — stylex
and folding (~1.2 ms) — fall below even vanilla's 1.51 ms.

### styled-components — lib slice 4.14 ms/render

| function | source | self/render ms | % of lib |
|---|---|---:|---:|
| `generateAndInjectStyles` | styled-components.esm.js:1 | 2.58 | 62.3% |
| `(anonymous)` | styled-components.esm.js:1 | 0.479 | 11.6% |
| `(anonymous)` | styled-components.esm.js:1 | 0.157 | 3.8% |
| `(anonymous)` | styled-components.esm.js:1 | 0.124 | 3.0% |
| `S` (styled component) | styled-components.esm.js:1 | 0.112 | 2.7% |
| `escapeTextForBrowser` | react-dom (server-legacy) | 0.192 | — |
| `retryNode` | react-dom (server-legacy) | 0.154 | — |
| `pushStartInstance` | react-dom (server-legacy) | 0.122 | — |

The button's whole styled-components cost is one function: `generateAndInjectStyles` takes 62.3% of
the lib slice on its own. Per instance it re-runs the interpolations, hashes the resulting rule set to
a class name, pushes it through stylis, and injects the sheet — the parse-hash-inject pipeline, paid
every render because the dynamic interpolations force styled-components to re-derive the class rather
than reuse one.

### emotion — lib slice 5.72 ms/render (the most expensive)

| function | source | self/render ms | % of lib |
|---|---|---:|---:|
| `murmur2` | @emotion/hash | 3.33 | 58.1% |
| `(anonymous)` (styled base) | @emotion/styled base:110 | 0.915 | 16.0% |
| `serializeStyles` | @emotion/serialize:188 | 0.410 | 7.2% |
| `(anonymous)` (element) | @emotion/react element:40 | 0.196 | 3.4% |

Emotion is dearer than styled-components for one reason, and it is even more concentrated: `murmur2`,
the hash, alone is 58.1% of the lib slice. Where styled-components folds hashing into its combined
`generateAndInjectStyles`, emotion serializes the styles (`serializeStyles`) and then hashes the whole
serialized string on every render to name the class. That standalone hash is the single most expensive
styling function in the entire realistic-button cell — 3.33 ms/render, more than twice next-yak's whole
runtime slice.

### next-yak — lib slice 1.15 ms/render (runtime slice 0.84 ms)

| function | source | self/render ms | % of runtime |
|---|---|---:|---:|
| `Yak` | runtime/styled.tsx:82 | 0.739 | 87.8% |
| `useTheme` | next-yak/dist/context:7 | 0.113 | (hook) |
| `(anonymous)` (ssr harness) | techs/next-yak/ssr-entry.tsx:64 | 0.097 | — |
| `removeNonDomProperties` | runtime/styled.tsx:184 | 0.050 | 6.0% |
| `combineProps` | runtime/styled.tsx | 0.017 | 2.0% |

Next-yak never hashes and never injects at render time — the class is emitted at build time, so the
whole parse-hash-inject pipeline that dominates emotion and styled-components is simply absent. What
remains is the `Yak` runtime component, which *is* a real React function component rendered once per
styled element: it reads theme context (`useTheme`), filters `$`-prefixed and undefined props off the
DOM element (`removeNonDomProperties`, a `for…in` copy loop), merges any composed className/style
(`combineProps` → `mergeClassNames`), and calls `createElement`. `Yak` is 87.8% of the runtime slice.
The trade is stark: next-yak's whole styling runtime (1.15 ms) is roughly a fifth of emotion's (5.72 ms),
because it does bookkeeping where the others do string work.

### next-yak-perf — lib slice 0.93 ms/render (runtime slice 0.86 ms)

| function | source | self/render ms | % of runtime |
|---|---|---:|---:|
| `Yak` | runtime/styled.tsx:87 | 0.708 | 82.2% |
| `useTheme` | next-yak/dist/context:7 | 0.068 | (hook) |
| `removeNonDomProperties` | runtime/styled.tsx:217 | 0.067 | 7.8% |

On a flat, single-level button the perf runtime barely moves the needle: `Yak` drops only from 0.739 to
0.708 ms. There is nothing here for the perf transform to collapse — the per-instance work (theme read,
prop filter, `createElement`) is irreducible while the `Yak` component still renders. The perf rewrite's
win is structural, not per-call, so it shows up in composition, not here.

### next-yak-perf-folding — lib slice ≈ 0.00 ms/render

| function | source | self/render ms | % of lib |
|---|---|---:|---:|
| `(anonymous)` (ssr harness) | techs/next-yak-perf-folding/ssr-entry.tsx:64 | 0.147 | — |
| `pushAttribute` | react-dom (server-legacy) | 0.147 | — |
| `renderInstances` (harness) | ssr-entry.tsx:60 | 0.043 | — |

Folding is the lever on flat JSX. The `(unmapped: runtime)` package is **gone from the profile
entirely** — no `Yak`, no `useTheme`, no `removeNonDomProperties`. The transform recognises that
`<StyledButton>` renders a known intrinsic element and rewrites it at build time to
`<button className="…">`, so no styling component renders at all. What is left is pure React-DOM
`pushAttribute` plus the bench harness — the same floor as vanilla. This is why folding's wall median
(1.23 ms) sits with stylex and below vanilla.

### stylex — no styling runtime on the hot path

| function | source | self/render ms | note |
|---|---|---:|---|
| `realistic_button_default` | case/realistic-button/index.tsx:12 | 0.058 | compiled static style object |
| `renderInstances` / `(anonymous)` | techs/stylex/ssr-entry.tsx | 0.140 | bench harness |

Stylex has effectively **no styling library on the render path**. Its atomic classes are produced at
build time; the only styling-attributable function is the compiled style object being read
(`realistic_button_default`), and merging the resulting static class strings is trivial. Like folding,
stylex pays no runtime for the styling itself — the whole cell is React-DOM plus harness. It shares the
sub-1.3 ms floor with vanilla and folding.

---

## compose-3 — the depth weak spot, 3-level composition, 1000×

The wall medians fan out with the runtime each still pays under depth: baseline next-yak (2.28 ms)
carries three nested `Yak` renders per instance, the perf and folding builds collapse them to 0.92 and
0.84 ms, closing most of the gap to vanilla's 0.59 ms. This is where the yak families separate.

### next-yak — lib slice 1.89 ms/render (runtime slice 1.53 ms)

| function | source | self/render ms | % of runtime |
|---|---|---:|---:|
| `Yak` | runtime/styled.tsx:82 | 1.42 | 92.8% |
| `useTheme` | next-yak/dist/context:7 | 0.128 | (hook) |
| `combined` | runtime/cssLiteral.tsx:114 | 0.044 | 2.9% |
| `removeNonDomProperties` | runtime/styled.tsx:184 | 0.040 | 2.6% |

Here is the weak spot in one number: `Yak` self-time nearly doubles from the flat button (0.739) to
composition (1.42 ms/render), and it is now 92.8% of the runtime slice. The `frame` drill shows why —
**`Yak` calls `Yak`.** Each composition level is its own React function component, so wrapping a styled
Button in a styled Wrapper in a styled Wrapper renders three nested `Yak` components per instance, and
every level independently re-runs `useTheme` (three context reads), `removeNonDomProperties` (three prop-
filter loops), `combined`/`combineProps` (className merges up the chain) and `createElement`. Composition
depth *D* multiplies the entire runtime by *D*, and layers *D* nested `renderWithHooks` reconciler frames
on top. The flat button pays this tax once; compose-3 pays it three times.

### next-yak-perf — lib slice 0.20 ms/render (runtime slice 0.20 ms)

| function | source | self/render ms | % of runtime |
|---|---|---:|---:|
| `Yak` | runtime/styled.tsx:87 | 0.146 | 74.0% |
| `Object.assign.$dynamic` | runtime/styled.tsx:341 | 0.026 | 13.4% |

This is the perf runtime's headline. `Yak` falls from 1.42 ms to 0.146 ms — roughly a ten-fold cut —
and the whole runtime slice with it (1.53 → 0.20 ms). The `frame` drill shows the mechanism directly:
in the baseline, `Yak`'s callers are `renderWithHooks` **and `Yak`** (the nested-component recursion);
under perf the only caller is `renderWithHooks` — **the `Yak → Yak` chain is gone.** The perf compile
flattens the three-level composition into a single component that reads theme and filters props once,
then just `Object.assign`s the merged dynamic style objects down the (now collapsed) chain. Composition
depth stops multiplying the runtime.

### next-yak-perf-folding — lib slice 0.14 ms/render (runtime slice 0.14 ms)

| function | source | self/render ms | % of runtime |
|---|---|---:|---:|
| `Yak` | runtime/styled.tsx:88 | 0.117 | 82.4% |
| `renderInstances` (harness) | ssr-entry.tsx:60 | 0.019 | — |

Unlike the flat button — where folding erased `Yak` completely — a residual `Yak` (0.117 ms) survives
compose-3. Folding can only rewrite a styled component whose host is a statically known intrinsic
element; when a styled component wraps *another component* rather than a tag, the transform cannot
resolve the final element and class chain across the composition boundary, so a runtime wrapper stays.
On composition, folding and perf land in the same place (0.14 vs 0.20 ms) and folding adds essentially
nothing over the perf runtime it is built on — the perf collapse is what did the work.

---

## dyn-fair — one dynamic value per instance: css-var vs `.attrs` inline-style

The wall medians sit close — styled-components 1.48 ms, next-yak 1.32 ms, vanilla 0.68 ms — because
neither library regenerates a class here; the gap over vanilla is each one's per-instance component wrapper.

### next-yak — lib slice 0.93 ms/render (runtime slice 0.58 ms)

| function | source | self/render ms | % of runtime |
|---|---|---:|---:|
| `Yak` | runtime/styled.tsx:82 | 0.567 | 98.6% |
| `useTheme` | next-yak/dist/context:7 | 0.094 | (hook) |

Next-yak routes the dynamic value through a CSS custom property: the class is static and only the
`--var` value changes, so — as in every yak cell — there is no per-render hashing or injection. But the
`Yak` runtime component still renders for every instance and still pays its fixed tax; `Yak` is 98.6% of
a runtime slice that is otherwise almost pure overhead. The dynamic-value handling itself is cheap; the
component wrapper around it is the whole cost.

### styled-components — lib slice 0.80 ms/render

| function | source | self/render ms | % of lib |
|---|---|---:|---:|
| `(anonymous)` (attrs/style exec) | styled-components.esm.js:1 | 0.311 | 39.1% |
| `(anonymous)` | styled-components.esm.js:1 | 0.072 | 9.1% |
| `S` (styled component) | styled-components.esm.js:1 | 0.056 | 7.0% |
| `mt` | styled-components.esm.js:1 | 0.049 | 6.1% |

The contrast with realistic-button is the whole story. There, `generateAndInjectStyles` (the hash-and-
inject) was 62% of the lib slice and 2.58 ms; **here it is absent from the hot path entirely.** Using
`.attrs` to push the dynamic value as an inline `style=""` attribute means no new class is generated per
render, so the expensive parse-hash-inject pipeline never runs. What is left is the lighter attrs/style
execution (the top anonymous, 0.311 ms) plus the component shell. This flips the ranking: on the static
button styled-components was 3.6× dearer than next-yak, but on a single dynamic value it is actually
*cheaper* on the lib slice (0.80 vs 0.93 ms) — because `.attrs` sidesteps its own worst function while
next-yak still pays the full `Yak` wrapper.

---

## Family comparisons

**What the perf runtime compiles away (baseline → perf).** Nothing, on flat depth-1 JSX: the
realistic-button `Yak` moves only 0.739 → 0.708 ms, because the per-instance theme read, prop filter and
`createElement` are irreducible while the component renders. Everything, on composition: compose-3 `Yak`
falls 1.42 → 0.146 ms by removing the `Yak → Yak` nesting recursion — the baseline renders one styled
React component per composition level, the perf build flattens the chain into a single component and
replaces the per-level re-render with an `Object.assign` of the merged style objects.

**What folding removes on flat JSX but not on compose-3.** On the flat button folding deletes the entire
`(unmapped: runtime)` package — `Yak`, `useTheme`, `removeNonDomProperties` all vanish, because
`<StyledButton>` is rewritten to `<button className="…">` at build time and no styling component renders.
On compose-3 a styled component wraps another component, not a tag, so folding cannot resolve the host
element across that boundary and a residual `Yak` (0.117 ms) stays. Flat JSX is folding's domain;
composition is the perf runtime's.

**Where each family's time actually goes, in one line each.** styled-components: `generateAndInjectStyles`
— hash + stylis + inject, per render (62% of lib). emotion: `murmur2` — hash the serialized string, per
render (58% of lib). yak baseline: `Yak` — a React component per styled element doing theme read + prop
filter + prop merge + `createElement`, multiplied by composition depth (88–99% of the runtime slice).
yak-perf: `Yak`, but composition-flattened, so the same function at a tenth the cost under depth. stylex:
nothing on the hot path — static atomic classes, no runtime.

---

## What to optimize in next-yak — ranked by potential win

1. **Collapse the composition chain in the baseline runtime (biggest lever).** The single largest yak
   hot number anywhere is `Yak` at 1.42 ms/render on compose-3, 92.8% of the runtime slice, driven by
   the `Yak → Yak` per-level recursion. The perf runtime already proves the ceiling: flattening the chain
   takes it to 0.146 ms — a ~1.27 ms/render saving, an order of magnitude, on exactly the depth pattern
   real component trees hit constantly. This is the highest-value change and it is already prototyped.

2. **Cut the fixed per-instance `Yak` tax on flat and dynamic cells.** Where folding cannot apply (a
   styled component used dynamically, or wrapping another component), `Yak` still costs 0.57–0.74 ms/render
   and is 88–99% of the runtime slice. Its callees are the addressable pieces: `useTheme` (0.09–0.13 ms —
   a context read that could be skipped when a component interpolates no theme), `removeNonDomProperties`
   (a full `for…in` prop-copy loop that could be replaced by a precomputed prop mask at build time), and
   `combineProps`/`mergeClassNames`. Shaving these is worth ~0.2–0.3 ms/render on every non-folded instance.

3. **Widen folding past intrinsic-element hosts.** Folding erases the runtime completely on flat JSX
   (lib slice → 0.00 ms) but gives up at composition boundaries, leaving `Yak` at 0.117 ms on compose-3.
   Any progress teaching the transform to fold through a styled-wraps-styled seam converts composition
   cases from "runtime wrapper" to "zero runtime" — smaller absolute win than (1), but it is the only path
   to the vanilla/stylex floor for composed trees.

The through-line: next-yak's cost is never string work (it hashes and injects nothing) — it is the
`Yak` React component rendering once per styled element, and once per composition level. Every lever
above is about rendering that component fewer times, or making each render do less.
