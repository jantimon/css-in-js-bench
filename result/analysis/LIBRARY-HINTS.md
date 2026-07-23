# Library hints — one perf change per library, for its maintainers

One evidence-based hint each, drawn from the SSR function-level profiles
(`CPU-HOTSPOTS.md` plus fresh recordings for goober, panda, tailwind-merge, cnfast, and a
composition recording for stylex — all `wpd record --target node --iterations 30 --warmup 5`,
`n = 1000`, the `node:inspector` sampler frame excluded). vanilla is the reference floor, not a
target. Self-time figures are the sampled window ÷ 30 (per case-render of 1000 elements), in the
same convention as `CPU-HOTSPOTS.md`; the robust signal is each function's **share of its
library slice** and the **lane-to-lane ratios** from `BENCHMARK.json` (`msPer1kElems`). All
numbers 3 significant figures.

Shape per library: where the time goes → the one change → the expected win → the one thing it
already does best.

---

## styled-components

**Where the time goes.** On realistic-button `generateAndInjectStyles` is 2.58 ms/render — 62.3%
of the 4.14 ms library slice. It re-runs the interpolations, hashes the resulting rule set,
pushes it through stylis and injects the sheet, every render, because the dynamic interpolations
force a fresh class rather than a reused one.

**The hint.** Split the static rule from the dynamic one. A styled component whose template is
static apart from a handful of interpolated values re-derives the *whole* class each render; if
the static body were hashed and injected once at first use (keyed on the template's identity)
and only the dynamic values rode a CSS variable or inline style, the per-render path would drop
`generateAndInjectStyles` to a variable write. The library already owns the template's stable
identity and already separates static from dynamic parts internally, so the split is reachable
without an API change.

**Expected win.** Lanes that emit the class at build time render this button about 2.6× faster
(stylex 0.440 vs styled-components 1.142 ms/1k), and this one function is most of that gap. The
library's own `.attrs` path proves the ceiling: on dyn-fair, where `.attrs` pushes the dynamic
value as inline style, `generateAndInjectStyles` leaves the hot path entirely and the slice falls
to 0.800 ms.

**Already does best.** The `.attrs` inline-style path sidesteps its own worst function — on a
single dynamic value it beats next-yak's wrapper (lib 0.800 vs 0.930 ms/render).

---

## emotion

**Where the time goes.** `murmur2` (the hash) is 3.33 ms/render on realistic-button — 58.1% of
the 5.72 ms library slice, the single most expensive styling function anywhere in the run.
Emotion serializes the styles and then hashes the whole serialized string every render to name
the class.

**The hint.** Cache the hash on the serialized-string identity. `serializeStyles` already
produces the string that `murmur2` consumes; when a component's serialized output is unchanged
between renders (the common case for a static or lightly-dynamic component), the hash is the same
every time yet gets recomputed from scratch. A memo keyed on the serialized string — or hashing
incrementally as `serializeStyles` builds it, so the standalone pass disappears — removes the
re-hash. The registered-styles cache already stores results by name; it only lacks a skip on the
name-computation itself.

**Expected win.** The non-hashing lanes render realistic-button about 6.3× faster (stylex 0.440
vs emotion 2.773 ms/1k), and `murmur2` alone is 58% of emotion's slice — cutting the re-hash is
the bulk of the recoverable time.

**Already does best.** Object/array style composition stays nearly flat under depth — emotion
rises only 1.40× across six composition levels (2.08 → 2.91 ms/1k) where the next-yak styled
baseline rises 4.09×, because `serializeStyles` merges the composed styles once instead of
nesting a component per level.

---

## goober

**Where the time goes.** On realistic-button `s` (the hash-and-cache-lookup in
`goober.modern.js`) is 2.45 ms/render — 61.3% of the 4.00 ms goober slice. It re-serializes the
compiled CSS to a string and hashes it char-by-char to find the cached class. On dyn-translate,
where every one of 1000 elements has a distinct value, the compile step (`o`, object → CSS) adds
3.16 ms and the hash 1.17 ms — together about 88% of goober's 4.93 ms slice.

**The hint.** Key the compile+hash cache on the tagged-template identity, not on the produced
string. Goober receives the template's `strings` array (a stable reference) and the resolved
interpolation values; today it evaluates the interpolations, recompiles to a CSS string and
re-hashes that string on every render even when the static structure never changes. A memo on
`(strings, resolvedValues)` skips both the recompile and the hash for the unchanged case, leaving
only the interpolation eval. The library holds both inputs at the call site already.

**Expected win.** Build-time-class lanes render realistic-button about 3.0× faster (stylex 0.440
vs goober 1.335 ms/1k) and dyn-translate about 7.1× faster (stylex 0.867 vs goober 6.162); the
serialize+hash pair is essentially the whole gap.

**Already does best.** The smallest runtime of the hash-and-inject libraries, and the class cache
(`c[u]`) means an identical rule injects only once no matter how many elements use it.

---

## stylex

**Where the time goes.** On flat JSX there is nothing — the atomic classes are built ahead of
time and no styling runtime touches the render path (realistic-button 0.440 ms/1k, below
vanilla). Cost appears only under composition: at six levels `styleq` (the atomic merge/dedup) is
0.217 ms/render, about 38% of a 0.563 ms styling slice, re-deduping a growing atomic array at
each nested level.

**The hint.** Memoize `styleq` on the identity of its input style arrays. When a composed chain
spreads the same atomic arrays down every level, `styleq` re-walks and re-dedupes an ever-longer
list per level; a cache on the array references collapses the repeated merges. This is a small
lever — most of stylex's depth rise is the nested React components, not `styleq` — but it is the
only styling function stylex still runs at render time.

**Expected win.** Small and bounded: stylex already sits at the vanilla floor on flat JSX. The
depth rise it could trim is 0.521 → 1.328 ms/1k across d1→d6, of which `styleq` is roughly a
third; the rest is React nesting the library can't remove.

**Already does best.** The reference-class winner — zero styling runtime on flat JSX, tying
vanilla (0.521 vs 0.524 ms/1k at depth 1) while shipping atomic, deduped classes.

---

## panda

**Where the time goes.** Panda's runtime atomic serializer, whenever a `css()` call lands on the
render path. On compose-6, where each level calls `css({…})` inline, `inner` (the recursive
style-object walk) is 6.45 ms/render (29.3%), `serializeCss` 2.39 ms, `hypenateProperty` 2.29 ms,
with `toClass`, `withoutSpace` and `isImportant` behind them — together about 93% of panda's
17.9 ms/render slice, run once per `css()` per level. The contrast is the whole story: on
realistic-button the `css()` calls sit at module scope, run once at import, and panda's render
slice is only ~0.320 ms (react-dom dominates).

**The hint.** Fold static `css({literal})` call sites to the resolved atomic class string at
build time. Panda already parses these exact object literals during `cssgen` to emit the CSS;
emitting the resolved class list back to the call site — as next-yak's fold does — removes the
runtime serialize entirely, the way a module-hoisted call already avoids it. *Variant notes:* the
`cva`/recipe lane precompiles variants and pays none of this (btn-variant recipe 0.804 vs css-fn
13.2 ms/1k — 16.4×); the style-props lane runs the serializer per prop per element and is the
worst of the three everywhere (realistic-button style-props component-time 47.4 ms vs css-fn
0.237). The recipe path is the one to steer variant styling toward.

**Expected win.** Folding the inline `css()` would take compose-6 from 18.3 ms/1k toward the
~0.800 ms floor the recipe lane already reaches — about 93% of panda's slice is the serializer,
so nearly all of it is recoverable.

**Already does best.** When `css()` is module-hoisted and static, the runtime is close to free and
the atomic classes dedupe — realistic-button render slice ~0.320 ms, react-dom-bound.

---

## tailwind-merge

**Where the time goes.** `get` — the LRU lookup keyed on the joined class string — is 0.963
ms/render on realistic-button (63.9% of the 1.51 ms slice) and 1.24 ms/render on compose-6
(70.1%). Even on a cache *hit* the call rebuilds the key by joining ~40 tokens (`twJoin`) and
hashing it for the object lookup, once per element and six times per element under composition.

**The hint.** Let the cache key on argument identity, not on a freshly built string. The static
class constants passed to `twMerge(clsx(...))` have stable references; a memo on those references
skips both the `twJoin` concat and the string lookup for an invariant class list. A build step
that hoists a fully-static `twMerge(clsx(...))` result to a constant would remove the render-path
call outright. The conflict-resolution result cache already exists — the residual cost is
rebuilding and re-looking-up the key every render.

**Expected win.** cnfast does the same job minus the conflict-resolution key overhead and renders
compose-6 1.30× faster (1.178 vs 1.537 ms/1k); a hoisted static merge closes most of that gap,
since `get` is 64–70% of tailwind-merge's slice.

**Already does best.** Correctness the plain concatenators can't match — it resolves Tailwind
class conflicts (last-wins), and its LRU keeps a repeat cheap (no trie walk shows up in the
profile).

---

## cnfast

**Where the time goes.** On repeated class lists cnfast is nearly free — realistic-button slice
~0.187 ms/render, react-dom-bound. The cost shows only when the cache misses: on dyn-translate,
where every element's arbitrary-value class is distinct, `mergeVariadicCached` is 0.633 ms/render
(37.5% of the 1.69 ms slice) and `cn` 0.433 ms (25.6%), falling through to `tailwindMerge`
conflict resolution once per distinct combination.

**The hint.** Split the invariant prefix from the per-instance token. When only one class in the
set varies per element, the variadic cache keys on the whole tuple and misses every time; merging
the stable prefix once (a guaranteed hit) and appending the volatile token without re-running
conflict resolution over the full set keeps the miss path off the hot loop. cnfast owns the merge,
so it can cache the stable segment separately.

**Expected win.** Narrow by design — cnfast already ties the floor whenever the cache hits. The
only recoverable case is high-cardinality dynamic classes: dyn-translate 1.801 vs vanilla 0.601
ms/1k (3.00×), where the cache-miss merge is the gap.

**Already does best.** The fastest lane in the whole bench on repeated class lists — the variadic
cache makes static merges essentially free (product-grid 0.481 ms/1k, at or below the static-class
libraries).

---

## next-yak

**Where the time goes.** `Yak` — one real React component per styled element — rendered once per
composition level. On compose-3 it is 1.42 ms/render, 92.8% of the runtime slice, and it scales
straight-line with depth: SSR library self-time runs 0.472 → 3.88 ms across d1→d6 (76% of the
whole render at d6). It never hashes or injects; the cost is the wrapper rendering, `useTheme`, a
`for…in` prop filter (`removeNonDomProperties`) and a class merge, repeated per level.

**The hint.** Teach the styled fold to *chain*. Follow a static `styled(styled(…styled.tag))`
chain to its terminal tag at build time, concatenate the level classes, and rewrite
`<ComposedButton>` straight to `<tag className="c0 c1 …">` — following alias bindings during
registration and re-folding a produced `<Ln className>` when `Ln` is itself registered. The
pieces exist (`FoldTarget::Component` resolves one hop, `immutable_bindings` proves the hops
safe); what is missing is the fixpoint plus alias-following. The runtime alternative — already
prototyped — is to ship the perf runtime as default: it flattens the chain at construction time
and holds the curve flat without any transform change.

**Promote from the experiments.** The perf runtime collapses compose-3 `Yak` from 1.42 to 0.146
ms/render (about 10×) by removing the `Yak → Yak` per-level recursion; the css-prop fold merges a
six-level chain into a single class, shipping 2 bytes of JS and tying vanilla at every depth. Both
are shipped code today — the css-prop-folded path is the one to recommend on hot composed trees,
and the perf runtime is the one to make default for the styled API.

**Expected win.** The perf runtime takes compose-6 from 5.22 to 0.807 ms/1k (6.5×); css-prop
perf-folding reaches 0.509, tying vanilla (0.508). Fold-chaining would bring the styled API to the
same floor the css-prop fold already hits.

**Already does best.** It hashes and injects nothing at render — the parse-hash-inject pipeline
that dominates emotion and styled-components is simply absent, and the folded css-prop path ships
~2 bytes of JS while matching vanilla's render cost.
