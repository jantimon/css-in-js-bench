# Round 2 — experiment verdicts (git f706a7c, 2026-07-22T13:51Z)

Nine cases x 18 lanes, Chrome 150 / Firefox 152, Node v25.8.1. Three cases are new this run:
`multifile-composition` (a file-split clone of `tabs`), `dyn-fair` (same workload as
`dyn-translate`, every lane on its documented best practice) and `dyn-inline` (control:
vanilla + yak on a static class plus inline style). All numbers 3 sig figs with units.

Lane families: **folding** = `next-yak-folding`, `next-yak-perf-folding`, `next-yak-css-folding`,
`next-yak-css-perf-folding`; each pairs with a **non-folding** twin (`next-yak`, `next-yak-perf`,
`next-yak-css`, `next-yak-css-perf`). The folding-vs-twin ratio is the folding advantage.

---

## a. THEORY 1 — "folding is per-module, so a module boundary erodes the folding win" — DEBUNKED

`multifile-composition` moves the styled primitives (`Tab`, `Tabs`, `FullWidthTabs`) into an
imported `./parts` module; everything else matches `tabs` byte for byte. If JSX folding were
blocked at the module boundary, the folding lanes should fall back toward their non-folding twins.
They do not.

**Folding advantage over the non-folding twin — SSR renders/s, tabs vs multifile:**

| folding lane | tabs | multifile | change |
|---|---|---|---|
| next-yak-folding (styled) | **1.46x** | **1.44x** | −0.02x |
| next-yak-perf-folding (styled) | 1.17x | 1.12x | −0.05x |
| next-yak-css-folding (css-prop) | 1.28x | **1.32x** | +0.05x |
| next-yak-css-perf-folding (css-prop) | 1.31x | 1.34x | +0.03x |

The advantage holds; the css-prop folding advantage even grows slightly across the boundary. The
lib self-time cut is identical too: the styled baseline's SSR attribution is 1.20ms lib (tabs) /
1.15ms lib (multifile), and folding drops it to 0.5-0.7ms lib in both. Per-lane cross-case deltas
for the folding lanes stay within noise on every measurement — SSR 0.92-0.98x, hydrate 0.94-1.05x,
mount 1.01-1.03x, **payload 1.00x** (css-folding ships 2.39kB, 0 JS, in both cases).

**The per-module hash observation.** The compiler treats `parts.tsx` as a separate module and
gives it different class hashes — `tabs` emits `.yuFIM1pA`, multifile emits `.ysSnqNKA` for the
same primitive — yet it folds both. The fold happens at the *use site* JSX and resolves the
import, so a different hash is not a broken fold.

**Three most telling numbers:** styled folding advantage 1.46x (tabs) → 1.44x (multifile);
css-prop folding advantage 1.28x → 1.32x; folding-lane payload cross-case delta 1.00x.

**Verdict: DEBUNKED.** The module boundary is not the boundary folding cannot cross. The boundary
that does defeat folding is *composition depth* — see compose-3 below, where three nested wrappers
leave folding-only at 0.956x the baseline (no benefit at all).

---

## b. THEORY 2 — "techs without native dynamic values dodge the cost; yak pays for it" — PARTIALLY (mostly the reverse)

### What the naive pattern costs each ecosystem (dyn-translate → dyn-fair, SSR renders/s)

Switching each lane from the naive per-value `translateX` to its documented best practice
(inline style for most) recovers throughput sharply for the rule-injecting libraries:

| lane | naive | best practice | recovery |
|---|---|---|---|
| goober | 181k | 952k | **5.27x** |
| tailwind-merge | 400k | 1.40M | 3.51x |
| styled-components | 196k | 650k | 3.31x |
| cnfast | 514k | 1.31M | 2.55x |
| emotion | 341k | 415k | 1.22x |
| Panda (css fn) | 283k | 348k | 1.23x |
| Panda (style props) | 177k | 198k | 1.12x |
| vanilla / yak css-var / stylex | ~unchanged (0.94-0.99x) | | |

The naive cost is real and it belongs to the per-value libraries, not yak. goober is the extreme:
the naive lane also hydrates in **1255ms** and mounts in 1233ms — a per-value inject storm. emotion
and Panda recover least because their "best practice" still routes through a hash/recipe engine, so
they cannot fully dodge (emotion keeps a client injection pass, Panda keeps 2.56ms recipe self-time
even inline).

### Does yak's native path still win at parity? Yes.

In `dyn-fair`, with everyone on best practice, yak's css-var folding lanes are the **fastest lanes
in the case** — SSR attribution 0.639ms vs vanilla inline-style 0.742ms (**0.86x**), ahead of
inline tailwind (0.898ms) and inline styled-components (1.686ms). yak ships a 105-byte sheet; the
now-inline libs shrink CSS to ~70-122 bytes but keep 10-13kB of JS.

### The css-var indirection cost, isolated inside yak (dyn-fair css-var vs dyn-inline inline)

`dyn-inline` puts yak on a fully static styled component with the transform as a plain inline
style — no css-var machinery. Holding the library fixed:

- **perf lane:** inline 1.10M vs css-var 799k — inline is **1.38x** faster; SSR 1.18ms vs 1.59ms
  (+0.42ms). The css-var per-instance write is irreducible runtime that the perf snapshot compiles
  the *static* path around but cannot fold.
- **9.6.0 baseline:** inline 739k vs css-var 737k — **identical** (SSR 1.617 vs 1.621ms). The
  styled() runtime dominates either way, so css-var adds nothing on top.
- **sheet size:** css-var adds 38 bytes (67B static → 105B with the variable rule).

So there *is* a measurable css-var cost, but only in the un-folded styled lanes. The path a real
app ships (css-prop, folded) compiles it cheap enough that css-folding (0.639ms) beats vanilla
inline (0.730ms). The net cost to a shipped app is negative.

**Three most telling numbers:** naive-pattern tax on the per-value libs 2.55-5.27x SSR; yak css-var
0.86x vanilla inline at parity (yak faster); css-var indirection inside the perf lane 1.38x (the
only place yak "pays").

**Verdict: PARTIALLY.** "Others dodge a naive cost" is CONFIRMED and large (2.55-5.27x). "yak pays
for dynamic values" is DEBUNKED at the shipped/idiomatic level — yak's native css-var path is the
fastest lane at parity. The grain of truth: css-var carries a real per-instance write cost (1.38x)
that shows only in the un-folded styled runtime; folding erases it.

---

## c. Elsewhere in the run — what the new normalized/tail metrics change

1. **compose-3 folding-only turned negative.** Fresh run: `next-yak-folding` SSR is 399k vs the
   styled baseline 418k — **0.956x, no benefit at all** (ROUND1 measured 1.14x). Folding cannot
   collapse three nested wrappers; the runtime survives (folding-only lib 1.62ms ≈ baseline 1.54ms).
   Only the perf snapshot rescues yak (1.30M, 3.12x), still **1.35x/element** behind vanilla
   (`msPer1kElems` 0.767 vs 0.567). This sharpens ROUND1's weak-spot call: the sole structural loss
   is composition depth, and folding is powerless against it.

2. **`dyn-fair` reshuffles the dynamic-value leaderboard.** ROUND1 read "styled-components/goober
   lose at dynamic values." That is a *naive-pattern* artifact: at best practice goober reaches
   952k and styled-components 650k SSR — competitive mid-pack, though still behind yak/vanilla. The
   ranking to keep is "the naive pattern is catastrophic for per-value libs," not "these libs are
   slow at dynamic values."

3. **The p75/p95 interaction tails do not re-rank anything.** Across every lane and case the WPD
   interaction-span p75/p95 sit at ~16-19ms — one frame. They are frame-quantized and flat; the
   real interaction separation lives in the INP bar medians (e.g. product-grid baseline 26.0ms vs
   css-folding 8.10ms, Panda style-props 247ms). No tail metric overturns a ROUND1 conclusion.

4. **`msPer1kElems` confirms the per-element ordering** and puts one clean number on the weak spot:
   compose-3 yak baseline 2.39 ms/1k vs vanilla 0.567 ms/1k — 4.2x/element for three-level
   composition, the widest per-element gap in the run.

---

## d. Next-iteration proposals (ranked by insight; each 0.5-2h; user-facing perf only)

1. **Dynamic-value UPDATE throughput / animation case (top).** The dyn trio measures first paint
   plus a single toggle; the sustained update path is still dark. Animate `translateX` across N
   frames and record frame time + dropped frames (the WPD harness already logs presented/dropped).
   Expected: css-var and inline rewrite one property with no sheet recalc, while per-value libs
   regenerate and inject per frame — the goober 1255ms naive-hydrate hints at the scale. This is
   the sharpest user-visible expression of Theory 2 and the one path the new cases leave unmeasured.
   ~1-2h; reuse the interaction/WPD driver.

2. **Composition-depth sweep (compose-N: 1 → 3 → 6 → 10), yak lanes.** Theory 1 proved the module
   boundary is *not* where folding breaks; compose-3 proves depth is. Chart SSR renders/s and
   hydrate for vanilla vs styled vs perf vs folding vs perf-folding as depth grows, to pin where the
   wrapper cost compounds and confirm perf holds while folding stays flat. ~1-2h; parametric case
   generator on the existing pipeline.

3. **css-prop lane for compose-3.** compose-3 is the one case yak loses and the only case with no
   css-prop lane. Elsewhere css-prop is 1.7-2.5x cheaper than styled() at SSR. Add it to learn
   whether the css-prop path narrows the compose-3 gap to vanilla — a direct "use css-prop on hot
   composed paths" answer. ~0.5-1h; author the missing variant, harness exists.
