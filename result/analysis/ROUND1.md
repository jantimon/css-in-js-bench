# Round 1 — baseline mechanism read (git f706a7c, 2026-07-22)

Six cases x 18 lanes, Chrome 150 / Firefox 152, Node v25.8.1, on a busy dev box.
Treat sub-15% gaps as noise unless the raw spreads say otherwise. All numbers 3 sig figs.

Lane key (next-yak family):

- **next-yak** — published styled() runtime, 9.6.0. The baseline every ratio is measured against.
- **next-yak-perf** — local perf snapshot, styled() API.
- **next-yak-folding** — local JSX-folding snapshot, styled() API.
- **next-yak-perf-folding** — perf + folding, styled() API.
- **next-yak-css\*** — the same four, but the `css` prop API instead of `styled()`.
  (No css-prop or panda-props/recipe lanes exist for compose-3.)

---

## 1. Per case — who wins each measurement and why

### btn-variant (variant/state button, n=1000, low cardinality)

- **SSR throughput / load / CPU split.** cnfast (1.54M renders/s) and the folding lanes
  (next-yak-folding 1.49M, css-folding 1.48M) win; the 9.6.0 baseline is 645k. Mechanism:
  the baseline's SSR render (1.45ms) is 0.64ms **lib self-time** — the styled() runtime
  resolving and merging classNames per instance. Its SSR byPackage is `next-yak 12.5ms` self
  plus a `(unmapped: runtime) 16.7ms` slice; next-yak-folding shows `next-yak-folding 10.1ms`
  and **no runtime slice**. Folding removes the wrapper component, perf moves resolution to
  build time. styled-components mirrors the baseline (1.46ms; `styled-components 31.9ms +
  stylis 1.24ms`). panda is 14.7ms, essentially all component self-time (13.2ms) — its recipe
  engine runs per element.
- **Interaction.** tailwind 6.10ms / stylex 6.60ms lead; next-yak 7.00ms is in the same
  cluster (spreads 5-25% overlap). panda/panda-props ~57ms re-run the recipe engine per event.
- **Hydration / mount.** Build-time and folding lanes finish 49-58ms hydrate / 68-95ms mount;
  react-dom span self-time (~3.6-4.5ms) dominates. styled-components (126ms hydrate) and goober
  (139ms) inject their sheet client-side.
- **Paint/Layout.** Uniform: every lane does 1 style recalc, 1 layout, 0 forced reflows. A wash.
- **Payload.** css-folding 3.39kB (0 JS, 224-byte rule) vs baseline 4.33kB (941 bytes runtime
  JS) vs styled-components 16.5kB (12.9kB JS).

### compose-3 (3-level component composition, n=1000)

This is the one case where **next-yak structurally loses at SSR**, and where the two yak
snapshots diverge hardest.

- **SSR.** vanilla wins outright (1.70M renders/s, 0.565ms render, no lib cost). The **perf**
  snapshot rescues yak — next-yak-perf 1.27M (**3.28x** over the 387k baseline) — but **folding
  alone barely moves it** (next-yak-folding 441k, **1.14x**). Mechanism: the baseline byPackage
  carries a `(unmapped: runtime) 44.3ms` self-time slice; the folding-only lane still shows
  `(unmapped: runtime) 46.6ms` — folding cannot collapse three distinct wrapper components into
  their host elements, so the runtime layer survives. Perf compiles that layer away
  (`(unmapped: runtime)` drops to 3.36ms). Best yak folding (perf-folding, 1.02ms) is still
  **1.81x slower than vanilla** at SSR — the residual wrapper handling three levels.
- **Interaction / hydrate / mount.** vanilla 6.9ms INP; perf lanes 7.3ms; baseline 12.7ms and
  folding-only 10.5ms re-run the runtime per node. cnfast/next-yak-folding mount fastest
  (~84ms) — folding *does* trim a wrapper on the cold-mount path even where it barely helped SSR.
- **Payload.** vanilla 3.05kB (0 JS); next-yak-folding 3.58kB (786-byte runtime).

### dyn-translate (naive per-value translateX, n=1000, high cardinality)

The families split by **how they encode 1000 distinct values** (see §3). next-yak-css-folding
wins SSR (1.64M, ahead of vanilla 1.55M), hydrate (50.0ms), payload (5.23kB, **96-byte CSS**)
and scaling. styled-components (201k SSR, 4.99ms render) and goober (165k, 6.03ms) lose by
synthesizing and serializing a rule per value: byPackage `styled-components 69.8ms + stylis
51.4ms`, `goober 151ms`. cnfast bakes 1000 arbitrary-value classes (21.7kB payload).

### product-grid (400-tile shop page, n=400)

- **SSR.** At 400 tiles the react-dom floor dominates (react self ~1.1-1.2ms), so the top lanes
  converge: next-yak-css-folding 229k, vanilla 208k, stylex 190k. The 9.6.0 baseline (65.1k) is
  **3.5x** slower — byPackage `(unmapped: runtime) 71.6ms + next-yak 19.5ms` self-time that
  folding/perf remove. emotion 13.2ms render is `@emotion/styled 88.7ms + @emotion/hash 78.7ms`.
- **Interaction.** cnfast / next-yak-css-folding 9.50ms; baseline 30.9ms, next-yak-perf 23.7ms
  re-run the runtime over the tile subtree; folding cuts that to 9.9ms. Sheet-regenerating libs:
  styled-components 36.8ms, emotion 59.4ms, panda-props 274ms.
- **Hydrate / mount.** next-yak-folding 60.2ms / 132ms; runtime libs that inject 400 tiles of
  rules trail badly (styled-components 364ms, panda-props 400ms hydrate).
- **Payload.** css-folding 7.20kB; tailwind/cnfast ~26-27kB (14.4kB HTML of inlined classes).

### realistic-button (the DenseButton, n=1000)

Folding lanes win every SSR and interaction metric. Baseline SSR 2.54ms carries 0.80ms lib
self-time; folding/perf drop lib to 0.08-0.18ms. INP: css-folding 6.90ms vs baseline 14.1ms.
Mount: next-yak-folding 107ms (span js 6.04ms, layout 5.43ms) vs styled-components 230ms (span
js 8.92ms, injecting `styled-components 1.10ms + stylis 0.94ms` on mount). Payload css-folding
3.94kB vs baseline 4.75kB.

### tabs (150 Tabs groups, n=150)

- **SSR / hydrate.** css-prop folding lanes lead (142k renders/s, 49.9ms hydrate). The css-prop
  path beats the styled path decisively here (next-yak-css 111k vs next-yak 52.3k). Baseline lib
  self-time 0.89ms; emotion 4.08ms (`@emotion/hash 18.5ms`).
- **Paint/Layout — the one case the browser pipeline separates the families.** Build-time and
  yak lanes: 1 style recalc, 1 layout, 1 paint. **emotion, goober and styled-components force a
  2nd layout and 18 paints** — they insert their stylesheet *after* first layout, invalidating
  it. 0 forced reflows everywhere, but the extra layout+paint passes are a real client
  injection cost.
- **Interaction.** stylex/vanilla 6.20ms; css-prop lanes 6.8-7.4ms; baseline 14.4ms.

---

## 2. next-yak focus — where the lanes differ, and where yak loses

### 2a. Snapshot lanes vs the 9.6.0 baseline

**The perf snapshot removes the styled() runtime layer.** The clearest signal is the SSR
byPackage `(unmapped: runtime)` self-time slice — the per-instance className resolution/merge
the published runtime does. It is small on flat single components (btn 16.7ms) and large on
composition/scale (compose-3 44.3ms, product-grid 71.6ms). Perf collapses it to a few ms.

| lane vs lane | metric | compose-3 | product-grid | btn-variant | realistic-button | tabs | dyn-translate |
|---|---|---|---|---|---|---|---|
| **perf** advantage (perf/baseline) | SSR renders/s | **3.28x** | 1.65x | 1.09x | 1.12x | 1.43x | 1.23x |
| **folding** advantage (folding/baseline) | SSR renders/s | 1.14x | 2.76x | 2.31x | 2.25x | 1.56x | 1.09x |

The two snapshots attack **different costs**: perf kills the runtime layer (wins where
composition/scale makes that layer heavy — compose-3), folding removes the wrapper *component*
(wins where the JSX is flat and repeated — btn-variant, product-grid, realistic-button). They
are complementary; perf-folding is at or near the top of every SSR metric.

**css-prop is dramatically cheaper than styled() in the baseline** — the wrapper component, not
the CSS, is the cost. next-yak → next-yak-css SSR: btn 1.88x, product-grid 2.49x, tabs 2.12x,
realistic-button 1.74x, dyn-translate 1.93x. On top of css-prop, folding still adds 1.22-1.45x
and perf a further slice. (compose-3 has no css lane — a gap worth filling; see H3.)

### 2b. Folding advantage in the SAME-FILE cases — the multi-file baseline

Folding's SSR-throughput advantage over the styled baseline (same file, this run):

- **Flat, repeated JSX:** product-grid **2.76x**, btn-variant **2.31x**, realistic-button **2.25x**.
- **Composition / dynamic:** tabs 1.56x, compose-3 **1.14x**, dyn-translate 1.09x.

The css-prop family is steadier (1.22-1.45x) because the wrapper it folds is lighter to begin
with. **The leverage tracks JSX flatness**: folding collapses a styled component into its host
element, so a screen of 400 identical tiles gains most, and a 3-level composition (where three
wrapper components nest) gains least — folding cannot cross the composition boundary. **A module
boundary is the same kind of boundary.** These 1.09-2.76x deltas are the ceiling the upcoming
multi-file experiment should erode: when the styled component and its use site sit in different
files, folding is expected to fail and these lanes should regress toward the non-folding lanes.

### 2c. Where next-yak loses, and the mechanism

- **compose-3 SSR — loses to vanilla by 1.81x** even at best (perf-folding 1.02ms vs 0.565ms).
  Mechanism: folding blocked by composition; residual wrapper + runtime for three nested
  levels. This is the structural weak spot. vanilla also beats stylex here (stylex 1.00ms).
- **Interaction on the 9.6.0 baseline** — a per-update weak spot the snapshots mostly fix but
  never fully: product-grid baseline 30.9ms INP vs cnfast 9.50ms (**3.3x**), tabs 14.4ms vs
  stylex 6.20ms, realistic-button 14.1ms vs 6.90ms. The runtime re-resolves styles for the
  interacted subtree; static-class lanes (stylex, cnfast, tailwind, vanilla) only swap a
  className. Even the best yak lane only *ties* the static leaders on INP, never clearly beats.
- **Against cnfast/stylex at SSR** the best yak folding lane wins everywhere except compose-3
  (yak/cnfast attribution ratio 0.32-0.73x = yak faster; yak/stylex 0.59-0.91x). So outside
  composition, next-yak (folded) is not losing to the static-class libraries at SSR — it is the
  **published styled() baseline** that loses, not the mechanism.

---

## 3. Dynamic values (dyn-translate) — what each family pays

The case renders 1000 elements each with a distinct `translateX`. What ships:

| family | encoding | CSS gz | SSR render | hydrate | mount | total payload |
|---|---|---|---|---|---|---|
| **vanilla** | 1 static rule `.dynBase` + inline `style="transform:translateX(Npx)"` | 333 B | 0.727 ms | 62.2 ms | 85.3 ms | 5.50 kB |
| **next-yak (css-var)** | 1 rule `transform:translateX(var(--x))` + inline `style="--x:Npx"` | **96 B** | 0.661 ms* | 50.0 ms* | 69.2 ms* | 5.23 kB* |
| **cnfast (tailwind)** | 1000 baked arbitrary-value classes `[transform:translateX(Npx)]` | 5.23 kB | 1.97 ms | 68.0 ms | 83.3 ms | 21.7 kB |
| **styled-components** | 1000 distinct rules via stylis | 14.0 kB | 4.99 ms | 153 ms | 154 ms | 35.1 kB |

\* next-yak-css-folding lane (the idiomatic css-prop path). The styled() baseline lane
(next-yak) is 1.75ms SSR — that is the styled() API tax from §2, not the CSS-var mechanism.

**next-yak's CSS-var indirection vs vanilla inline style — the overhead is negative:**

- **SSR:** css-var 0.661ms vs vanilla 0.727ms (yak **0.91x**; byPackage self 6.17ms vs 6.62ms).
  Writing 1000 inline `--x:Npx` declarations costs the same as 1000 inline `transform:...`
  declarations — within noise, marginally cheaper.
- **Browser:** hydrate 50.0 vs 62.2ms (**0.80x**), mount 69.2 vs 85.3ms (0.81x), INP
  (css-perf-folding) 4.70 vs 6.30ms. yak ships a **96-byte** sheet vs vanilla's 333-byte sheet;
  HTML is essentially equal (5.13kB vs 5.17kB — `--x:0px` ~ `transform:translateX(0px)`).
- **Style pipeline:** both do 1 style recalc / 1 layout / 0 forced reflows. The CSS-var value
  change is a property write, not a structural change.

So the CSS-variable path is **not** an overhead over inline style — it is neutral-to-cheaper on
both SSR and browser, while shrinking the sheet to one rule. The cost in this case lives
entirely in the per-value **rule-injecting** libraries (styled-components 35.1kB / 4.99ms,
goober 165k renders/s / 169ms n=4000, emotion 38.8kB) that regenerate a rule per distinct
value. The upcoming fairness experiment should confirm that the naive `translateX` pattern
penalizes those libraries, not next-yak — and that a "fair" idiomatic variant would leave yak's
CSS-var and vanilla's inline-style within noise of each other.

---

## 4. Hypotheses — new user-facing measurements (ranked by insight / effort)

**H1 (top). Dynamic-value *update* throughput.** Measure the browser cost of *changing* N
dynamic values over successive frames (animate translateX), not just first paint. INP already
hints at it (dyn-translate: css-var 4.70ms vs tailwind 14.1ms vs goober 22.3ms vs panda-props
30.8ms). Expected insight: the CSS-var / inline-style path rewrites one inline property with no
sheet recalc, while rule-injecting libraries trigger a per-frame regenerate-and-inject storm
(GC + style recalc). This is the sharpest, most user-visible expression of the §3 finding and
directly feeds the fairness experiment. Effort: **medium** (new interaction driver varying
values across frames; reuse the INP/WPD harness).

**H2. Composition-depth sweep (compose-N: 1 → 3 → 6 → 10).** Chart SSR renders/s and hydrate
for vanilla vs next-yak styled vs perf vs folding vs perf-folding as depth grows. Expected: the
folding advantage decays with depth (already 2.31x flat → 1.14x at 3 levels) while perf holds;
pinpoints where the styled() wrapper cost compounds. This is the same boundary the **multi-file**
experiment probes (module boundary ≈ composition boundary), so it is the natural precursor.
Effort: **medium** (parametric case generator; existing pipeline).

**H3. styled() vs css-prop API cost, on *every* case.** The run shows next-yak → next-yak-css is
1.74-2.49x SSR, but compose-3 (the one case yak loses) has no css lane. Add css-prop variants
everywhere and chart the API-choice delta. Expected insight: the wrapper component is the
dominant runtime cost, not the CSS — a direct "use css-prop on hot paths" guide, and it would
tell us whether css-prop closes the compose-3 gap to vanilla. Effort: **low** (author the
missing css-prop variants; harness exists).

**H4. Client style-injection passes as its own chart.** tabs already exposes it (emotion/goober/
styled-components force a 2nd layout + 18 paints vs 1/1 for build-time+yak). The counts live in
`measurement-wpd-blame.json`; surface "extra layout/paint passes caused by client sheet
insertion" as a first-class metric across cases. Expected: runtime libs scale extra passes with
group/tile count; build-time and yak stay at 1. Effort: **low** (data already recorded).

**H5. Repeated-interaction INP distribution (p75/p95), not just median.** Fire many rapid
interactions on the 400-tile grid and chart the tail. Expected: build-time and folded-yak lanes
stay flat; the 9.6.0 baseline (30.9ms median) and runtime libs (emotion 59.4ms, panda-props
274ms) develop fat tails as re-resolution/regeneration compounds. Effort: **low-medium** (extend
the INP harness to keep the distribution).

Ranking rationale: **H1 and H2** map one-to-one onto the two stated upcoming experiments
(dynamic-value fairness, multi-file folding) and should be built first. **H3** is cheap and
sharpens the central next-yak story (API choice > CSS mechanism). **H4** is nearly free (data
exists). **H5** adds tail-latency realism last.
