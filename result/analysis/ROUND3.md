# Round 3 — the composition-depth curve (git f706a7c, run 2026-07-22T18:01Z)

Eleven cases x 18 lanes, Chrome 150 / Firefox 152, Node v25.8.1. New this run: the depth sweep
`compose-1` / `compose-3` / `compose-6` — one visual button family at 1, 3 and 6 styled levels,
every lane present. The three cases share source byte-for-byte apart from the number of wrapper
levels, so the delta across them is pure composition depth. All numbers 3 sig figs with units.

The styled lane is `L0 = styled.button` / `L1 = styled(L0)` / … / `const ComposedButton = L_n`,
used as `<ComposedButton>`. The css-prop lane is `css` fragments interpolated into each other
(`l1 = css\`${l0};…\``) applied to **one** `<button css={l_n}>`. Same styles, two authoring models
— and the depth curve is a story about which model, and which yak escape hatch, survives depth.

---

## a. The curve, per family — SSR cost per 1000 elements (ms/1k, lower better)

`msPer1kElems` from the SSR microbench is the clean per-element render cost. Depth D runs left to
right:

| family | mechanism | d1 | d3 | d6 | shape |
|---|---|---:|---:|---:|---|
| **vanilla** | one component, static class list | 0.524 | 0.512 | 0.508 | flat (floor) |
| **stylex** | nested components, atomic-class merge | 0.521 | 0.963 | 1.33 | **rises** |
| **styled-components** | hash+inject per level | 1.11 | 1.23 | 1.42 | rises |
| **cnfast** | nested components, utility concat | 0.557 | 0.787 | 1.18 | rises |
| **next-yak (baseline, styled)** | `Yak` wrapper per level | 1.28 | 2.52 | 5.22 | **rises steepest** |
| **next-yak-folding (styled)** | use-site fold, one hop | 0.451 | 2.46 | 5.28 | wins d1, dies d3/d6 |
| **next-yak-perf (styled)** | construction-time chain flatten | 0.734 | 0.758 | 0.807 | **flat** |
| **next-yak-perf-folding (styled)** | fold + perf runtime | 0.492 | 0.770 | 0.849 | wins d1, flat after |
| **next-yak-css (css-prop)** | one element, no chain | 0.624 | 0.604 | 0.599 | flat |
| **next-yak-css-folding (css-prop)** | one merged class, 4 B JS | 0.563 | 0.548 | 0.563 | **flat** |
| **next-yak-css-perf (css-prop)** | one element + perf | 0.568 | 0.569 | 0.588 | flat |
| **next-yak-css-perf-folding (css-prop)** | one merged class, 2 B JS | 0.536 | 0.510 | 0.509 | **flat, wins d6** |

Read this table and the whole round is settled. Four shapes:

1. **Flat at the floor — vanilla and every css-prop lane.** vanilla writes one component with a
   static class list; the css-prop model writes one `<button css>` whatever the depth. Neither
   nests, so neither pays for depth. css-perf-folding ties vanilla at every depth (0.509 vs 0.508
   ms/1k at d6) while shipping 2 bytes of JS.

2. **Flat above the floor — the styled perf runtime.** perf holds 0.734 → 0.807 ms/1k across the
   sweep. The mechanism is the runtime, not the transform: it stores the chain's terminal target,
   merges every level's attrs and style processors **once at construction**, and renders the target
   in a single wrapper — so the `Yak → Yak` per-level recursion never happens. A single residual
   `Yak` (one theme read, one prop filter) keeps it ~0.3 ms/1k above vanilla; depth stops mattering.

3. **Rises steepest — the styled baseline.** 1.28 → 2.52 → 5.22 ms/1k is a straight line in D. Each
   level is its own React component, so a 6-deep chain renders six nested `Yak` bodies per element,
   each re-reading theme, re-filtering `$`-props (`removeNonDomProperties`), merging class names up
   the chain. SSR lib self-time tracks it exactly: 0.472 → 1.26 → 3.88 ms, and at d6 that `Yak`
   self-time is 76% of the whole 5.13 ms render.

4. **Wins at d1, collapses onto the baseline after — styled folding.** The use-site fold rewrites
   `<ComposedButton>` to a plain tag, but only **one hop**: `const ComposedButton = L_n` is an alias
   that never registers, and even without it the fold visits a node's children, folds once, and does
   not re-visit its own output. At d1 one hop is the whole chain, so folding erases the wrapper and
   is the fastest lane in the case (0.451 ms/1k, lib self 0.108 ms, 2.83x the baseline). At d3 the
   remaining `styled(styled(...))` runs untouched (0.990–1.02x the baseline, lib self 1.64 ms ≈
   baseline 1.26 ms); at d6 it is dead level with the baseline (5.28 vs 5.22 ms/1k).

The three rising **reference** lanes (stylex, styled-components, cnfast) rise for the same reason
the baseline does — their compose source nests React components too (stylex spreads an `xs` atomic
array down L0…L5; cnfast concatenates utility strings per level). The rise is React frames plus each
level's merge, not a styling inject. vanilla stays flat because it collapses the whole family into
one component by hand — which is exactly what the perf runtime and the css-prop fold do
automatically.

---

## b. Where each yak rescue stops working

**Folding (use-site rewrite) stops at depth 2.** It removes at most one composition level. At d1
that is everything and folding beats vanilla; at d≥2 the inner chain survives and folding buys
nothing. This is not a measurement artifact — the compiled `compose-6` microbench entry for the
folding lane is `jsx(ComposedButton, …)` with
`ComposedButton = styled(styled(styled(styled(styled(__yak_button("yJh9Q9E"))…))))` — the full
runtime chain. The flat class list you see in the folded lane's SSR HTML
(`class="yJh9Q9E yJh9Q9E1 … yJh9Q9E5"`) is that chain's **runtime output**, produced at cost D, not
a build-time fold.

**The perf runtime (construction-time chain flatten) does not stop.** It holds flat through d6
(0.807 ms/1k, lib self 0.253 ms). It never reaches the vanilla floor because one `Yak` wrapper still
renders — theme read, prop filter, `createElement` — but depth adds nothing on top of that fixed
cost. This is the one yak rescue that actually addresses composition, and it is a runtime change, so
it works no matter how the transform folds.

**The css-prop fold never had a chain to stop at.** Because the authoring model is one element, the
fold has one job: concatenate the six fragment classes into one `className`. It compiles `compose-6`
to `({children}) => jsx("button", { className: "yPqnE0w6", children })` — one static class, zero
runtime, 2 bytes of JS. There is no depth for it to fail against.

---

## c. css-prop single-class merge vs styled flat-class-list fold, at depth 6

This is the sharpest contrast in the run, and the answer is yes — the two folds behave nothing alike
under depth.

- **css-prop, one merged class.** The fold walks the fragment chain and emits **one** class
  `yPqnE0w6` on a plain `<button>`. No wrapper, no chain, no runtime — 0.509 ms/1k (ties vanilla),
  lib self 0.088 ms, 2 bytes JS, and it is the winning yak lane at d6 (1.96M renders/s vs vanilla
  1.97M).

- **styled, flat class list — but only when the fold fires.** The styled fold, when it fires, emits
  a flat multi-class list on the tag. At d6 it does **not** fire (alias + one-hop), so the six-deep
  `styled(styled(...))` chain stays, runs six `Yak` bodies, and produces that flat class list at
  runtime — 5.28 ms/1k (dead level with the baseline), lib self 3.59 ms, 820 bytes of runtime JS.

Same visual result, same final class list in the DOM, a **10x** gap in how it got there: the
css-prop merge is a build-time collapse to zero runtime; the styled "fold" at depth is the runtime
doing the work the fold declined to do. The css-prop model wins because its authoring shape gives the
fold a single element to merge onto; the styled model asks the fold to chain, and it can't.

---

## d. The other curves — interaction, mount, hydrate, payload

**INP (ms, lower better) — the second clean depth signal.** Interaction re-renders the tapped
subtree, so the same per-level `Yak` cost shows up again:

| family | d1 | d3 | d6 |
|---|---:|---:|---:|
| next-yak (baseline) | 7.70 | 11.1 | 23.0 |
| next-yak-folding (styled) | 7.50 | 9.90 | 23.4 |
| next-yak-perf (styled) | 7.50 | 7.80 | 7.40 |
| next-yak-css-perf-folding | 7.60 | 5.20 | 7.60 |
| vanilla | 7.30 | 7.60 | 7.40 |

The baseline degrades 7.70 → 23.0 ms and styled folding tracks it (23.4 ms at d6) — both re-run the
six-deep chain on interaction. The perf and every css-prop lane stay at one frame (~7–8 ms). INP is
the user-visible face of the SSR curve: depth turns a one-frame tap into a three-frame one on the
styled baseline.

**Mount (ms, lower better).** Same order, softer: baseline 87.8 → 92.3 → 104 ms, perf-folding flat
66.0 → 71.9 → 72.6 ms. (vanilla's 25.7 ms at d6 is a spread-0.89 outlier, not a real floor — ignore
it.)

**Hydrate (ms, lower better).** The reliable trend is baseline 54.4 → 60.2 → 70.3 ms rising, perf
flat 46.1 → 47.4 → 49.7 ms. Several folding cells at d1 (perf-folding 84.8 ms, css-folding 90.7 ms)
carry spreads of 0.25–0.53 and read as noise; hydrate does not re-rank anything the SSR curve
doesn't already say.

**Payload (gz B, lower better) — flat for everyone, near-zero JS for css-prop.** The JS runtime is a
fixed cost; only the CSS sheet grows a little as levels add rules. css-folding ships **4 bytes** of
JS at every depth (2.66–2.66 kB total), css-perf-folding 2 bytes; the styled baseline carries its
1.09 kB runtime (3.77 → 4.05 kB), styled folding 820 bytes. Depth does not move the byte count — the
cost of depth is all render-time CPU, not shipped code.

---

## e. Verdict

**Composition depth is the next-yak weak spot — but only for the styled authoring model on the
default runtime, and next-yak already ships two escapes from it.** The baseline `Yak` wrapper costs
scale linearly with depth on every axis that matters: SSR 1.28 → 5.22 ms/1k, SSR lib self-time
0.472 → 3.88 ms (76% of the render at d6), INP 7.70 → 23.0 ms, hydrate 54.4 → 70.3 ms. The cause is
one function — `Yak` (`runtime/styled.tsx`) — rendered once per composition level. Folding does not
help past depth 1: it rewrites one hop and the alias blocks even that on the composed binding.

But the shipped, idiomatic paths do not have the weak spot. The **css-prop model is depth-invariant
and wins outright at every depth** (css-perf-folding ties vanilla at d6, 0.509 ms/1k, 2 bytes JS),
because its one-element authoring lets the fold merge the whole chain into a single class at build
time. And the **perf runtime flattens the styled curve** (0.807 ms/1k flat) by collapsing the chain
at construction. So the honest verdict: the *un-flattened styled baseline* has a real, steep,
depth-linear weak spot; the css-prop path and the perf runtime each erase it.

**The compiler/runtime change that flattens the styled curve** is the one FOLDING-MECHANICS spells
out: teach the styled fold to **chain**. Follow a static `styled(styled(…styled.tag))` down to its
terminal tag, concatenate the level classes, and rewrite `<ComposedButton>` straight to
`<tag className="c0 c1 … c5">` — following alias bindings during registration and re-folding a
produced `<Ln className>` when `Ln` is itself a registered styled component. The pieces exist:
`FoldTarget::Component` already resolves one hop and `immutable_bindings` already proves the hops are
safe; what is missing is the fixpoint plus alias-following. This would give the styled model the same
result the css-prop fold already gets — one plain tag, one flat class list, zero runtime — at every
depth. Shipping the perf runtime as the default is the runtime-side alternative: it already holds the
curve flat, at the price of one residual `Yak` per element that the fold-chaining approach would
remove entirely.

---

## f. Still unexplained

Nothing in the depth curve is unexplained. Every shape ties to a named mechanism: vanilla and
css-prop flat (one element), perf flat (construction-time collapse), the baseline and styled folding
linear (`Yak` per level, fold stops at one hop), and the rising reference lanes (stylex, cnfast,
styled-components) linear for the same nested-component reason. The css-prop-vs-styled gap at depth 6
resolves to the authoring shape the fold is handed. FOLDING-MECHANICS' source read predicted each of
these before the sweep ran, and the sweep confirms them.

One optional forward probe, offered only because it would *validate* the fix rather than explain a
gap: **implement fold-chaining and re-run the sweep.** The prediction is exact — styled folding
should drop from 5.28 to ~0.51 ms/1k at d6 and ship the css-prop lanes' near-zero JS, matching
css-perf-folding. If it does not, the one-hop model of the fold is incomplete somewhere the source
read missed. ~1–2h on the existing pipeline; no new case needed.

---

## g. Clean-run confirmation (git f706a7c, run 2026-07-23T02:58Z)

The overnight idle-machine rerun confirms the depth-curve and fairness conclusions. Every shape in
§a holds: the baseline is depth-linear at 1.12 → 2.38 → 5.25 ms/1k (d1/d3/d6, was 1.28 → 2.52 →
5.22); the perf runtime stays flat at 0.685 → 0.765 → 0.806 ms/1k; css-perf-folding is
depth-invariant at 0.509 ms/1k across all three and ties vanilla (0.512) at d6; styled folding wins
d1, then collapses onto the baseline (0.99x at d3, 1.03x at d6) as the one-hop fold gives out. The
lib self-time signature is intact — baseline SSR lib runs 0.447 → 1.49 → 4.01 ms, 77% of the render
at d6. Every LIBRARY-HINTS expected-win ratio holds within ~15%: styled-components 2.6x on
realistic-button (0.442 vs 1.14 ms/1k), emotion 6.3x, panda recipe-vs-css-fn 16.1x (0.850 vs 13.7
ms/1k), tailwind-merge behind cnfast 1.35x at d6, the perf runtime 6.5x on compose-6.

Spreads tightened where the machine controls them. SSR microbench sits at ~3.5% median across the
174 cells (baseline lanes 1–3%), and the flat-case browser measurements firmed sharply — the
realistic-button hydrate cluster fell from up to ~50% spread to ~2%, so the folding-vs-stylex floor
tie now resolves as a genuine co-lead at high confidence rather than noise. Two sub-threshold
movements: on the clean data folding no longer sits alone at #1 on the flat realistic-button — it
edges stylex (907k vs 905k renders/s) where the two now read as a floor tie, both clear of the field;
and at d1 the perf-folding lane edges plain folding for the top spot (2.53x vs 2.30x the baseline),
though both still beat vanilla, so §a's "styled folding fastest at d1" is now "the folded styled
lanes win d1, perf-folding first." Neither crosses a ranking-of-conclusions or 20%-ratio bar. The
compose-case hydrate/INP cells stay noisy (hydrate to ~50% at low depth), an inherent low-sample
browser signal the idle machine does not fix, so those specific cells remain low-confidence — as the
per-case analyses mark them.
