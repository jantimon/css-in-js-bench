# Folding mechanics — what the next-yak compiler folds, and what stops it

Source read at next-yak `df1f11237c3c43e57d04518b47f45a8d5cb38bf6` — the exact folding
commit the bench pinned its `next-yak-folding` / `next-yak-css-folding` lanes from, so the
code below *is* the code those lanes ran. Line references point into
`packages/yak-swc/yak_swc/src` (the Rust SWC plugin) and `packages/next-yak/runtime`.

## The mechanism in one paragraph

Folding is a **same-module, one-level** rewrite. During the main transform pass the plugin
registers every `styled` declaration whose class is fully known at build time
(`lib.rs:1292`, `styled_jsx_fold.rs:111`). After the whole module is walked, a second pass
(`fold_jsx_usages`, `styled_jsx_fold.rs:154`, run from `visit_mut_module` at `lib.rs:762`)
walks the *same module's* JSX and rewrites `<StyledX .../>` into either the plain DOM tag
(`<div className="yX"/>`) or, for `styled(Component)`, the wrapped component
(`<Card className="yX"/>`), deleting the `Yak` runtime wrapper for that element. It only ever
touches usages whose opening-tag identifier resolves — by scope-carrying `to_id()`
(`styled_jsx_fold.rs:287`) — to a component registered *in that module*. There is no
cross-file metadata, no import resolution, no re-hashing at the use site. An imported styled
component therefore never folds at a foreign use site; the reason folding still "survives" the
bench's module split is that the primitives that fold do so inside their own module, and that
module moved wholesale. The wrapper it leaves on `compose-3` is not a fold failure at all — it
is the fold declining to chain and an alias hiding the one level it could take; only the perf
snapshot's *runtime* flattens the chain, and it does so at construction time, not in the
transform.

## Triggers — what makes a `<StyledX>` fold

The gate has two halves: a component must **register** (the declaration is foldable at all),
then each **usage** must survive the attribute check. Registration is decided at
`lib.rs:1292`:

```
if self.optimize_static_jsx                         // master switch, default true (lib.rs:107)
  && runtime_css_variables.is_empty()               // no dynamic css-var values
  && self.current_declarator_init_span == Some(n.span) {   // the whole initializer is this styled call
    if let Some(class_name) = transform.get_component_class_name() {
        self.styled_jsx_fold.try_register(current_variable_name, &n.tag, class_name, &runtime_expressions);
    }
}
```

`try_register` (`styled_jsx_fold.rs:111`) then demands a plain single-name `const` binding,
a foldable tag shape, and — crucially — that any `runtime_expressions` are all **class-toggling
arrows** (`styled_jsx_fold.rs:127`). A component may be *fully static* (no runtime
expressions → `YakClassName::Static`, `styled_jsx_fold.rs:641`) or *dynamic-by-class-toggle*
(arrows like `({ $active }) => $active && css("yA")`, inlined at the use site into
`"yB" + (on ? " yA" : "")`, `inline_runtime_expressions` `styled_jsx_fold.rs:757`). Both fold.
What does **not** fold is a dynamic *value* that compiles to a CSS custom property
(`runtime_css_variables` non-empty) — that keeps the runtime component.

| Trigger | Code | Result |
|---|---|---|
| Master switch on (folding lane) | `optimize_static_jsx`, `lib.rs:1292`, default `lib.rs:107` | folding enabled |
| `styled.div` / `styled("div")` on a known HTML tag | `fold_target` → `Native`, `styled_jsx_fold.rs:186`, `native_elements.rs` `VALID_ELEMENTS` | `<StyledX>` → `<div className="yX">` |
| `styled(Component)` with an uppercase component ref | `fold_target` → `Component`, `styled_jsx_fold.rs:215` | `<StyledX>` → `<Component className="yX">` |
| Fully static css (no interpolations) | `runtime_expressions` empty → `YakClassName::Static`, `styled_jsx_fold.rs:641` | class merged as a literal string at compile time |
| Dynamic **class-toggle** props (`$active && css\`…\``, ternaries over props) | arrows only, `styled_jsx_fold.rs:127`; inlined `styled_jsx_fold.rs:757`, `class_name_fold.rs:159` | condition inlined: `"yB" + (on ? " yA" : "")`, `$`-props dropped `styled_jsx_fold.rs:329` |
| `const` top-level binding, immutable target | `immutable_bindings`, `styled_jsx_fold.rs:229`, retained `styled_jsx_fold.rs:163` | binding safe to inline at every use site |
| `ref`, `style`, event handlers, extra `$`-props on a static component | forwarded unchanged, `fold_attrs` `styled_jsx_fold.rs:596` | fold still happens; props pass through |

`ref` deserves a call-out: it does **not** block folding. React 19 (next-yak's floor) passes
`ref` as an ordinary prop, so the folded element and the runtime read it the same way — the
code omits `ref` from the injected-prop list on purpose (`styled_jsx_fold.rs:905`).

## Stops — every condition that keeps the runtime `Yak` wrapper

Two of these live in `try_register` (the component never registers) and the rest in
`fold_attrs` / `try_fold` (this particular usage bails). A usage that bails simply keeps the
`<StyledX>` runtime component; other usages of the same component can still fold.

| Stop | Code | Why |
|---|---|---|
| **Dynamic `styled(Component)`** (class-toggle arrows *and* a component target) | `styled_jsx_fold.rs:135` | `$`-prop forwarding into the wrapped component is a runtime decision the fold can't reproduce |
| **Dynamic value → CSS variable** (`translateX: ${x}`, theme-interpolated property values) | registration gated on `runtime_css_variables.is_empty()`, `lib.rs:1293` | the per-instance `--var` write is irreducible; the component stays a `__yak_div(class, {style})` runtime factory |
| **Runtime expression that isn't a class-toggle arrow** (function expressions, non-arrow) | `styled_jsx_fold.rs:127` | a `function` rebinds `this`/`arguments`; other shapes aren't inlinable |
| **`.attrs(...)` chain** | `fold_target` matches neither `styled.x` nor `styled(x)`, returns `None`, `styled_jsx_fold.rs:185` | `.attrs` injects props at runtime |
| **`styled.customElement` / unknown tag** | not in `VALID_ELEMENTS`, `styled_jsx_fold.rs:194` | fold has no DOM tag to emit |
| **`styled(lowercaseVar)`** | uppercase-only check, `styled_jsx_fold.rs:217` | a lowercase JSX name would parse as an intrinsic element |
| **Non-`const` / reassignable binding, or reassignable component target** | `immutable_bindings` filter, `styled_jsx_fold.rs:163`–`169` | the name must reference the same value at every use site |
| **Aliased binding** (`const ComposedButton = L2`) | registration keys on the `styled(...)` binding; the alias is a bare ident init, never registered; the use site looks up the alias id, `styled_jsx_fold.rs:287` | the alias id isn't in the component map — see compose-3 below |
| **Spread props** `{...rest}` on the usage | `fold_attrs` returns `None`, `styled_jsx_fold.rs:606` | a spread may carry `className` or other props known only at runtime |
| **`theme` prop on the usage** | `styled_jsx_fold.rs:623` | the runtime deletes the injected theme prop before the DOM; a fold would leak it |
| **Stray `css` prop still present** | `styled_jsx_fold.rs:626` | invalid at this point; left to the runtime to report |
| **Type arguments** `<Box<T> …/>` | `styled_jsx_fold.rs:292` | native tags take no type args and the wrapper's params don't match the wrapped component's |
| **Repeated attribute** (`id={a} id={b}`) | `styled_jsx_fold.rs:618` | only the last binds; the earlier expr would be reordered or dropped |
| **Namespaced attribute** (`xlink:href`) | `styled_jsx_fold.rs:612` | invisible to the ordering analysis while still evaluating on the element |
| **Impure prop values that can't be reordered** (a `f()` between two bound props) | `select_shape` → `ElementWrap`, `purity.rs`, `styled_jsx_fold.rs:508` | folds still happen, but wrapped in an IIFE to preserve evaluation order — not a stop, a heavier shape |

There is **no explicit `as`-prop support**: a polymorphic `as` is just forwarded as an ordinary
attribute, so folding keeps it on the folded element rather than switching the tag. Conditional
css (`css={on ? css\`…\` : undefined}`) is handled by the *css-prop* fold, not the styled
fold (`class_name_fold.rs:27`, `57`); it folds to a ternary of class strings.

## The module boundary — folding does not cross it, and does not need to

`fold_jsx_usages` runs over one `Module` and only rewrites usages whose tag id is in
`self.components`, which was filled from that module's own declarations. Imports are collected
into `immutable_bindings` (`styled_jsx_fold.rs:234`) purely so a *component fold target*
imported from elsewhere counts as immutable — never so an imported *styled component* folds.
The compiled bench output proves the split. In `multifile-composition/parts.tsx` the primitives
fold because they are declared **and used** in that file, inside the `TabInternal` and `Tabs`
wrapper components that moved there with them:

```js
// parts.tsx (compiled)
var TabInternal$1 = ({isActive, disabled, ...props}) =>
  jsx("li", { role:"presentation", className:"ysSnqNK6", children: jsx("button", {...}) });  // <TabListItem> folded
var Tabs$1 = ({children, className}) =>
  jsx("ul", { role:"tablist", onKeyDown:handleKeyDown$1,
              className: mergeClassNames("ysSnqNKA", className), children });                 // <TabList> folded
var Tab$1 = styled(TabInternal$1)("ysSnqNK7", ({isActive}) => isActive ? css("ysSnqNK8") : css("ysSnqNK9")); // NOT folded
var FullWidthTabs = styled(Tabs$1)("ysSnqNKB");                                               // NOT folded (no use site here)
```

Everything that actually crosses into `index.tsx` — `<Tabs>`, `<Tab>`, `<FullWidthTabs>` —
is emitted as a plain component call (`jsx(Tabs$1, …)`, `jsx(Tab$1, …)`,
`jsx(FullWidthTabs, …)`), **none folded**. `Tab` never could (dynamic `styled(Component)`),
`Tabs` is a plain function component, and `FullWidthTabs` *would* fold in one file but here is
imported, so `index.tsx` can't see it.

The single-file `tabs` output makes the one lost fold explicit. There `FullWidthTabs` is
declared and used in the same module, so its use site folds to the wrapped `Tabs` with the
class baked in:

```js
// tabs/index.tsx (compiled, single file)
var FullWidthTabGroup = ({group}) => jsx(Tabs, { className:"yuFIM1pB", children: … });  // <FullWidthTabs> FOLDED to <Tabs className>
// multifile-composition/index.tsx (compiled)
var FullWidthTabGroup$1 = ({group}) => jsx(FullWidthTabs, { children: … });             // NOT folded — imported
```

That single unfolded `styled(Tabs)` wrapper is the whole of the 1.46× → 1.44× erosion. The
per-module hash that ROUND2 flagged (`.yuFIM1pA` vs `.ysSnqNKA` for the same primitive) is
just the filename-seeded class hash (`naming_convention.get_base_file_name()`); it is not
evidence of cross-module folding, because both files fold their *own* primitives against their
*own* hash.

**Correction to the ROUND2 wording.** ROUND2 §a says "The fold happens at the use site JSX and
resolves the import, so a different hash is not a broken fold." The fold never resolves an
import. The accurate statement: the fold happens in the module that owns *both* the declaration
and the use site; the heavy primitives kept folding because their use sites (inside
`TabInternal`/`Tabs`) travelled to `parts.tsx` with them, and the only thing that genuinely
crossed the boundary either never folded or stopped folding. The empirical verdict ("the module
boundary is not what defeats folding") stands; the stated reason does not.

## Composition — why `styled(styled(styled…))` keeps a `Yak`, and what the perf snapshot does

`compose-3` is `L0 = styled.button` / `L1 = styled(L0)` / `L2 = styled(L1)` /
`const ComposedButton = L2`, used as `<ComposedButton>`. The folding transform emits:

```js
var ComposedButton$1 = styled(styled(__yak_button("ySYFqsP"))("ySYFqsP1"))("ySYFqsP2");
var compose_3_default = (i) => jsx(ComposedButton$1, { children: i });   // NOT folded
```

`__yak_button("ySYFqsP")` is only the compiled form of a static `styled.button` **declaration**
(`__yak_button = styled("button")`, `styledDom.tsx:*`) — still a runtime component, not a fold.
Two separate facts keep the whole chain at runtime:

1. **The alias.** `<ComposedButton>` looks up the id `ComposedButton`
   (`styled_jsx_fold.rs:287`), but registration keyed on the `styled(L1)` binding `L2`
   (`lib.rs:1298`). `const ComposedButton = L2` is a bare-identifier initializer, so it never
   registers. The use site finds nothing in the component map and bails.
2. **Folding never chains.** Even written as `<L2>`, the fold would rewrite the name in place
   to `<L1 className="ySYFqsP2">` and stop — `FoldVisitor` visits children first, then folds,
   and does not re-visit the node it just produced (`styled_jsx_fold.rs:338`–`349`). `L1` stays
   a runtime `styled(L0)` wrapper. A fold removes at most **one** composition level.

So `compose-3` folding does nothing to the runtime chain — three `Yak` bodies still run per
element — which is exactly the measured `0.956×` (lib 1.62 ms ≈ baseline 1.54 ms).

The fix in `next-yak-perf-folding` is a **runtime** change, not a transform change. Comparing
`styled.tsx` across the pinned commits: the perf runtime (`59ef95e7`) and perf-folding runtime
(`84774f9b`) are byte-identical to each other and *different* from the folding runtime
(`df1f112`). The perf runtime stores the chain's **ultimate target** as a fourth element of the
`yakComponentSymbol` tuple and merges every level's attrs and style processors at *construction*
time, then renders that target once:

```
// perf runtime (removed in the folding commit)
const targetComponent = isYakComponent ? parentTarget : Component;
// … a chain of N levels renders the target directly in ONE wrapper
// instead of re-entering every parent wrapper per element per render
… return <Target {...filteredProps} />;
```

The folding-commit runtime instead re-enters each parent by a direct call
(`parentYakComponent(filteredProps)`, `styled.tsx:159`): no React fiber per level, but every
level's `Yak` body (theme read, prop filter, class merge) still executes. That is why folding
alone gives no composition win and perf-folding collapses `compose-3` to a single residual `Yak`
(0.117 ms) — the perf runtime did the collapse, and folding, layered on top, adds nothing there
(`__yak_button` is the only thing it touched).

**To extend folding across composition** the transform would have to do what the perf runtime
does, at build time: follow a static `styled(styled(…styled.tag))` chain to its terminal tag,
concatenate the class names, and rewrite `<ComposedButton>` straight to
`<tag className="c0 c1 c2">` — chaining the fold through immutable `styled(Component)` bindings
(including through aliases) instead of stopping after one level. The pieces exist
(`FoldTarget::Component` already resolves one hop, `immutable_bindings` already proves the hops
are safe); what's missing is a fixpoint that re-folds a produced `<Ln className>` when `Ln` is
itself registered, plus following alias bindings during registration.

## Reconciling the empirical findings

- **Folding survives the module boundary (1.46→1.44, css-prop 1.28→1.32).** Explained: the
  primitives fold inside their own module; the split relocated their use sites too. The −0.02×
  is one lost `styled(Tabs)` fold (`FullWidthTabs`, now imported). The css-prop advantage even
  *grows* because css-prop folding (`css_prop.rs`, `class_name_fold.rs`) has no `styled(...)`
  wrapper to lose across the boundary — it folds a `css` prop on a plain element in whichever
  module the element sits.
- **Different per-module hashes yet both fold.** Explained: filename-seeded hash; each module
  folds against its own.
- **compose-3 folding-only 0.956×, residual `Yak` on the hot path.** Explained: alias + no
  fold chaining; the transform leaves the runtime chain intact and the folding-commit runtime
  runs every level.
- **css-prop folds a 6-level chain into ONE merged class; styled folds into a flat multi-class
  list.** Explained: the css-prop fold concatenates class strings directly at the element
  (`merge_class_name`, `styled_jsx_fold.rs:697`; `merged_class_names`, `:1223`), so nesting
  collapses into one `className`. The styled path can only rewrite the tag and hand the class
  down one hop, so a chain stays a chain of runtime wrappers each contributing its own class.
- **dyn-translate / dyn-fair components don't fold; class-toggle components (product-grid) do.**
  Explained and confirmed in the compiled output: `TranslatedDot = __yak_div("…", {style:{"--…":
  unitPostFix(({$translateX})=>$translateX,"px")}})` has a non-empty `runtime_css_variables`, so
  it never registers (`lib.rs:1293`) and `<TranslatedDot $translateX={i}>` stays a component
  call; product-grid's `$discount`/`$wishlisted` are class toggles, inlined to
  `"ycFtY6Q7" + (p.discount >= 30 ? " ycFtY6Q8" : "")`. This is the code-level reason for
  ROUND2's dyn-inline result that the css-var cost only shows in unfolded lanes.

Nothing in the bench findings is left unexplained by the code. The one item that needed real
digging — "how does an imported styled component fold" — resolved to "it doesn't; the bench's
own module split hid a co-located fold," which is a correction to the finding's wording rather
than an open question.

## Practical patterns for the README

**Keep folding effective**
- Define and *use* a styled primitive in the same file when you want its wrapper gone; a
  component only exported for reuse folds at its *callers'* sites only if those callers redefine
  it — so co-locate hot primitives.
- Prefer `styled.tag` / `styled("tag")` on real HTML tags, or `css`-prop on a plain element,
  over deep `styled(styled(…))` chains.
- Express variants as class toggles — `${({ $active }) => $active && css\`…\`}` — not as
  interpolated property values; toggles fold, css-vars don't.
- Keep the binding a plain top-level `const`; don't alias it (`const Btn = Base`), don't
  reassign it.

**Silently disables folding**
- `styled(Component)` with dynamic (`$prop`) styles — never folds.
- Dynamic *values* (`${x}px`, theme-interpolated property values) — compile to css-vars, keep
  the runtime component.
- `.attrs(...)`, `styled.customElement`, `styled(lowercaseVar)`.
- Spreading props (`{...rest}`) or passing a `theme` prop at the use site.
- Aliasing the component, or a non-`const` binding.
- Deep `styled`-wraps-`styled` composition — folds at most one level; the rest stays runtime
  until the transform learns to chain the fold (see above).

## Tip vs pinned commits

The worktree is checked out at `df1f112` — **the pinned folding commit itself**, so the folding
source analysed here is exactly what the bench ran; no tip-vs-pin discrepancy in the fold code.
The runtime does differ by lane: `next-yak-perf` and `next-yak-perf-folding` share the flattened
`styled.tsx` (with the `targetComponent` chain-collapse), while `next-yak-folding` ships the
simpler direct-call runtime. That runtime difference — not any transform difference — is why
folding alone cannot beat composition and perf-folding can.
