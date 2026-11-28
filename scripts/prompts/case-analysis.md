# Per-case analysis prompt

Run this with a strong model (Opus) from the repo root after a full `pnpm build`. It turns the
report numbers into one JSON summary per case, which `pnpm report` embeds into
BENCHMARK.html/.md as the "Analysis" block, and one study summary, which renders as the
"Key findings" panel above the cases.

---

You are writing the analysis text for a CSS-in-JS benchmark report. The report compares one set
of components built with about 20 styling libraries. Its readers are frontend developers who
want to know how a styling choice affects their users: server render time, download size, and
how fast the page starts and responds in the browser. Most of them have never opened this
repo. They read your text next to the charts, often after jumping to a random point on the
page, so every paragraph has to make sense on its own.

## Inputs

Read these files before you write anything. Every claim and every number in your text must
come from them.

- `BENCHMARK.json`: the reduced report data. `techs[<dirname>].label` is the name each
  library has in the charts. `cases[].meta.label` is the case title the reader sees, and
  `cases[].meta.description` is its intro. Per case and measurement it holds the median values
  the charts show: SSR render throughput (renders/s), autocannon (req/s), SSR CPU attribution,
  hydrate/inp/mount timings and Chrome profile slices, render-timing counts and ms, payload
  bytes, nsweep.
- `result/meta.json`: gitSha, timestamp, host, node.
- `result/snapshot.json`: per cell, every authored source file (`files: [{name, code}]`), the
  emitted HTML and the emitted CSS. Use it to explain what each library ships and does at
  render time. Do not measure anything from it.
- `result/measurement-*.json`: raw samples, for spreads when you judge confidence.
- `result/analysis/CPU-HOTSPOTS.md`, if it exists: function-level profile data.

## Output files

For every case in `BENCHMARK.json`, write `result/analysis/<caseId>.json` following the
`CaseAnalysis` type in `report/analysis-schema.ts` exactly. Then write
`result/analysis/study.json` following `StudyAnalysis`.

### Data fields

1. `measurements`: include every key the case has data for, out of: microbench, autocannon,
   attribution, hydrate, inp, mount, renderTiming, payload, nsweep.
   - attribution: rank by total renderMs (lower is better).
   - hydrate, inp, mount: rank by the repeated-timing bars. Use the Chrome profile slices to
     explain the order.
   - renderTiming: rank by Chrome style-recalc count (lower is better).
   - payload: rank by total gzipped bytes.
   - nsweep: rank by ms at the largest n.
2. `winner` is the best library's dirname. `top3` lists the three best (fewer if fewer exist),
   with the exact reduced value and `ratioToBaseline = value / the baseline value` (raw
   quotient, never inverted). The baseline is the default @yak/react styled API (`yak-react`),
   or null if it has no data in this case.
3. `confidence`: "low" when the top values' spreads overlap (check the raw samples), "medium"
   when the gap is under about 15%, else "high".
4. `provenance`: gitSha and runTimestamp from `result/meta.json` or the BENCHMARK.json meta,
   generatedAt = now (ISO), model = your model id. Set `interactionProtocol` to
   `index-shift-0-to-1`, and only analyze interaction samples that carry this protocol.

### Text fields

- `headline`: one sentence with the case's most useful takeaway for someone choosing a
  library.
- `why` (one per measurement): one paragraph of at most five sentences that explains the
  order in the chart. The chart already shows the order, so the paragraph says what causes it.
- `crossCase`: only for the sibling pairs below, with the concrete differences.
- `study.json`: `headline` is one sentence, the study's most useful takeaway. `findings` holds
  4 to 6 entries `{ title, prose }`. `libraryHints` holds one entry per library (not per
  variant), each under about 140 characters, with `yak-react` as the dirname for @yak/react.

## How to explain a result

Readers come to learn where the time goes and what a library could do about it. A list of
numbers repeats the chart, so build each `why` from causes:

1. Say what the leading library avoids, and how: "@yak/react compiles the styles into a
   static class at build time, so its styling code takes almost no time during render".
2. Name the largest remaining cost and its share: "most of the remaining 1.4 ms is React
   writing the class attribute". When `CPU-HOTSPOTS.md` names the function, give it in
   backticks and say in the same sentence what it does.
3. Contrast with what a slower library has to compute for every component during render:
   "Emotion hashes the full set of styles for each of the 400 cards".

Numbers support these sentences. They are never the sentence. Give at most three numbers per
sentence, each with its unit, rounded to three significant digits. A comparison names both
sides and says which way it goes ("2.1 times the render time of @yak/react").

Less effective: "Bamboo 6.68 ms, Panda 7.28 ms, Emotion 7.78 ms, styled-components 12.2 ms."
More effective: "Emotion and styled-components create their CSS while the page renders, which
costs them 3.10 of their 4.80 ms. Panda writes its CSS at build time, so it spends almost
nothing in the styling library and loses its time to React instead."

These examples show the shape. Do not reuse their wording or numbers.

## How to write

The report should read like a careful engineer explaining results to a colleague from another
team. These rules come from reader feedback on earlier versions, where the text was hard to
follow without knowing the repo and read as machine-written.

**Use the names the reader sees.**
- Name libraries by their chart label from `techs[].label`: "@yak/react (css prop)", "Panda
  (css fn)", "cn (shadcn-ui)". Never write a dirname such as `yak-react-css` or `panda-props`.
  When the variant does not matter, the library name alone is fine ("Panda", "@yak/react").
- Name another case by its title from `cases[].meta.label`, in curly quotes: “Tabs — split
  across files”. Never write the case id; the reader never sees it.
- Say "library" or the library's name for what the benchmark code calls a lane, "components"
  for instances, and "page" or "test page" for a workload or case. Do not write "lane", "cell",
  "cardinality", "workload", "instance", "span", "slice", "floor" or "ceiling" in reader
  text.
- Describe a build option instead of naming its config key: "with build-time optimization
  turned off", not `foldStatic: false`.

**Explain each technical term the first time a paragraph uses it.** The reader may land on any
paragraph, so a term explained in another case does not count. Short explanations are enough:
"hydration, the step where React takes over the server HTML", "the compiler replaces the styled
component with a plain HTML element at build time". After that, use the same word every time;
switching between synonyms makes readers wonder if you mean a different thing.

**Write plain, direct sentences.**
- Put the result first, then the cause, then the detail.
- Keep sentences under 25 words. Use the active voice, with the library or the browser as
  the subject.
- Use short, common words: "uses" not "utilizes", "about" not "approximately", "shows" not
  "demonstrates".
- Say things literally. Do not use metaphors or figures of speech ("pays a tax", "the floor",
  "drives it to zero", "the story", "under the hood", "a bet").
- Use commas, parentheses and full stops. Use at most one em dash per paragraph, and never as
  a dramatic pause. The em dash inside a quoted case title does not count.
- Use American spelling (optimize, color).

**State only what the data shows.**
- Report results. Do not judge libraries or give advice the data does not support ("choosing
  between the two is a bet on…", "a clear winner", "impressive").
- Write about the code as it is now. Do not mention earlier runs, fixes, versions or PRs.
- Every sentence must make sense to someone who has only seen this report. Do not refer to
  analysis files, study rounds, profiling tools by internal name, or anything you read outside
  the report's own data.
- If spreads overlap, say the libraries tie instead of ranking them.

**Patterns that make text read as machine-written.** Scan your draft for them and rewrite any
you find:
- A clause tacked on with "-ing" that comments on the sentence before it ("…, highlighting
  how…", "…, underscoring…").
- "Not X, but Y" and "It's not X. It's Y." Say Y.
- A colon that sets up a reveal ("The result: …").
- Groups of three adjectives or phrases added for rhythm.
- Words that announce importance: crucial, pivotal, "a key factor", notably, testament,
  underscores, highlights.
- Filler openings and closings: "It's worth noting", "Overall", "In short", a last sentence
  that repeats the paragraph.
- Vague sources: "experts say", "it is well known".
- These words: delve, leverage, robust, streamline, elevate, harness, foster, empower,
  showcase, landscape, game changer, cutting-edge, seamless.

## Facts the text must get right

**Dynamic values** (“Dynamic values — each library's recommended way” and any study finding
about it). For libraries that cannot style a value known only at render time, the recommended
way is a hand-written split: a static class plus an inline style for the changing value. The
developer does by hand, in every component, what @yak/react's compiler does on its own. Say
both halves: matching @yak/react this way costs developer effort on every dynamic value, and
the direct version in “Dynamic values — written directly” is what you get when nobody spends
that effort. Do not describe the cost as a fault of the other libraries' direct pattern.

**Sibling cases** for `crossCase`, with concrete differences:
- “Tabs — 150 tab groups” and “Tabs — split across files”: what moving the styled parts into
  a separate file costs.
- “Dynamic values — written directly” and “Dynamic values — each library's recommended way”.
  For @yak/react, the difference is what its CSS-variable path costs over a plain inline style.

**Solid.** Two variants render with Solid 2 instead of React: `yak-solid` (@yak/solid, styled
API) and its plain-CSS reference `vanilla-solid`, which is off by default. They run the same
pages, so they rank in the same lists. When you compare across frameworks:
- HTML bytes: Solid adds a unique hydration key (`_hk`) to every element, and unique strings
  do not compress, so Solid pages carry about 2.5 to 3 times the gzipped HTML of the React
  ones. This comes from Solid, not from the styling library. If payload text ranks a Solid
  variant, give this as the cause.
- JS bytes: a Solid variant's added JavaScript is measured against `vanilla-solid`, not
  `vanilla`. Solid removes unused code per app, so the figure also includes the parts of
  `@solidjs/web` that only the styling library pulls in.
- Interaction update (`inp`): both frameworks change each component's value from `i` to
  `i + 1` (React with state and `flushSync`, Solid with a signal and `flush`). Both warm up
  first, and the reset sits outside the timer. The timer stops at the first animation frame,
  so do not call it input latency or a finished paint. The Chrome profile runs one frame longer
  to include rendering work. The outer `run` span includes the reset and is not interaction
  timing. To judge the styling library, compare it with the plain-CSS version on the same
  framework; a cross-framework comparison also includes framework work.
- In the CPU attribution, the `react` bucket means "the framework": react-dom for React, and
  solid-js/@solidjs/* for Solid.

**Off-by-default variants** (`bench.defaultOff` in `techs/*/package.json`): never make them
the subject of a finding or a library hint. They are diagnostic variants (build-time
optimization turned off), extreme outliers (Panda with style props), or hand-written plain CSS
(`vanilla`, not a styling library). They can serve as evidence inside a sentence ("with
build-time optimization turned off, the same page takes…", "as fast as plain CSS"), and plain
CSS stays the reference point.

## Study findings

`study.json` is the first text on the page, above every chart. Each finding gets a `title` in
sentence case without a full stop that states the result ("Splitting styled components across
files turns off @yak/react's compiler"), and `prose` of at most five sentences. When a finding
draws on a case, name it by title the first time, followed by "below".

## Check before you finish

1. Every number in your text appears in the input files or follows from them by one step of
   arithmetic you can show. Recompute every ratio.
2. Search the text fields for dirnames (the keys of `techs`), case ids, the words this prompt
   rules out, and em dashes outside quoted case titles. Fix every hit. A start:
   `grep -noE "\b(lanes?|cells?|workloads?|instances?|cardinality)\b" result/analysis/*.json`.
3. Read each `why` and `prose` as a reader who landed on it directly. Rewrite any paragraph
   that needs another paragraph to make sense.
4. Run `pnpm report` and confirm it prints the ✓ lines. Then check that BENCHMARK.md has an
   "### Analysis" section per case and a "## Key findings" section.
