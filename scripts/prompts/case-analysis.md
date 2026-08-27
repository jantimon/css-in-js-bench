# Per-case analysis prompt

Run this with a strong model (Opus) from the repo root after a full `pnpm gen`. It turns the
report numbers into one JSON summary per case, which `pnpm report` embeds into
BENCHMARK.html/.md as the "Analysis" block.

---

You are analyzing a CSS-in-JS benchmark. Work from these inputs only:

- `BENCHMARK.json` — the reduced report data: per case, per measurement, per lane the median
  values the charts show (microbench renders/s, autocannon req/s, SSR CPU attribution,
  hydrate/inp/mount timings + WPD span slices, render-timing counts/ms, payload bytes, nsweep).
- `result/meta.json` — gitSha, timestamp, host, node.
- `result/snapshot.json` — per-cell source TSX, emitted HTML and CSS. Use it to explain
  mechanisms (what the lane actually ships and does), not to re-measure.
- Raw samples in `result/measurement-*.json` if you need spreads to judge confidence.

For EVERY case in `BENCHMARK.json`, write `result/analysis/<caseId>.json` following the
`CaseAnalysis` type in `report/analysis-schema.ts` exactly. Rules:

1. `measurements`: include every key the case has data for, out of: microbench, autocannon,
   attribution, hydrate, inp, mount, renderTiming, payload, nsweep.
   - For attribution use total renderMs (lower better). For hydrate/inp/mount prefer the
     repeated-timing bars; use the WPD span slices for the `why`. For renderTiming rank by
     Chrome style-recalc count (lower better). For payload use total gzipped bytes. For nsweep
     rank by ms at the largest n.
2. `winner` = the best lane's dirname. `top3` = the three best lanes (fewer if fewer exist),
   with the exact reduced value and `ratioToBaseline = value / the baseline lane's value`
   (raw quotient, never inverted). The baseline lane is the default next-yak lane
   (`next-yak`), or null if it has no data in this case.
3. `why` must name the MECHANISM, grounded in the numbers — not restate the ranking. Use the
   WPD data: SSR CPU attribution (react vs lib vs component self-time, byPackage), span
   slices (js/style/layout/paint/gc/idle), blame counts (style-recalcs, forced layouts), and
   the snapshot source/CSS. Good: "styled-components spends 3.1 of its 4.8 ms lib self-time
   serializing per-instance rules; the extracted lanes ship the sheet statically so their lib
   slice is ~0." Bad: "styled-components is slower because it is a runtime library."
   SHAPE of the prose: lead with what the winner's mechanism eliminates ("folding drives the
   lib slice to ~0"), then name the slowest REMAINING part and its share ("of what's left,
   X dominates at Y% of the lib time"), then contrast with what the loser must compute during
   render ("unlike Z, which has to calculate H per instance"). Never write a bare number
   enumeration across techs ("A 6.68ms, B 7.28ms, C 7.78ms…") — numbers are evidence inside
   the mechanism sentences, not the sentence itself. When function-level data exists
   (result/analysis/CPU-HOTSPOTS.md), name the actual function as X.
   AUDIENCE: study-level prose (study.json headline/findings) is a management summary read
   BEFORE any chart or example. Introduce every case on first mention as "the Example
   <caseId> shown below" — never assume the reader knows what compose-3 is. Wrap case ids,
   function names, and other identifiers in backticks (`compose-3`, `Yak`); the report
   renders backticked text in monospace and links case ids to their section anchors.
4. `confidence`: "low" when the top values' spreads overlap (check the raw samples), "medium"
   when the gap is under ~15%, else "high".
5. `headline`: one sentence, the case's single most useful takeaway.
6. `crossCase`: only where sibling cases exist — link tabs ↔ multifile-composition (module
   boundary vs JSX folding) and dyn-translate ↔ dyn-fair ↔ dyn-inline (naive vs idiomatic vs
   inline-style dynamic values) with the concrete deltas.
   FRAMING for dynamic values (dyn-fair and any study-level finding about it): the "best
   practice" implementations for libraries without native dynamic-value support are
   HAND-WRITTEN workarounds — the developer manually splits static class from dynamic
   inline style, replicating by hand what next-yak compiles automatically. Reaching parity
   that way is a build-time optimization done manually, per component, forever. Never frame
   it as "the cost belongs to the other libraries' naive pattern" — frame it as: next-yak
   ships the optimization as a feature; elsewhere the same result costs developer discipline
   on every dynamic value. State both halves: what parity costs the developer, and that the
   naive pattern is what you get when nobody pays that cost.
7. `provenance`: gitSha + runTimestamp from `result/meta.json` / BENCHMARK.json meta,
   generatedAt = now (ISO), model = your model id.
8. Numbers in prose: round to 3 significant digits, always with units. Never invent a number
   that is not derivable from the inputs.
9. Prose hygiene — write like a sharp human editor, not a model:
   - Active voice; concrete numbers, mechanisms and function names beat abstractions.
   - No trailing "-ing" analysis clauses ("…, highlighting/underscoring/taking X to Y").
     Say what happens in a full clause instead.
   - No colon reveals ("The best part: …"), no binary-contrast crutches ("This is not X.
     It's Y." — state Y), no importance puffery (pivotal, testament, underscores its),
     no throat-clearing ("It's worth noting"), no summary-recap endings.
   - Em dashes are not a rhythm: at most one per paragraph; prefer commas, colons for
     lists/labels, parentheses for asides.
   - Never use: delve, leverage, robust, streamline, elevate, harness, foster, empower,
     game changer, cutting-edge, transformative.
   - A punchy contrast is fine when it IS the claim; cut it when it only decorates one.
   - American spelling throughout (optimize, not optimise).

## Study-level findings (result/analysis/study.json)

Also write `result/analysis/study.json` per the `StudyAnalysis` type in
`report/analysis-schema.ts` — it renders as the "Key findings" panel above the cases:

- `headline`: one sentence, the study's single most useful takeaway.
- `findings`: 4-6 verdicts `{ title, prose }`, mechanism-forward, management-summary voice
  (see rule 3's AUDIENCE paragraph — introduce each case as "the Example `<caseId>` shown
  below", backtick identifiers).
- `libraryHints`: one entry per LIBRARY (not per lane), each under ~140 chars — use
  `next-yak` as the dirname for the next-yak entry.
- DEFAULT-OFF LANES (`bench.defaultOff` in techs/*/package.json — check which lanes carry
  it): never make them the subject of a finding or a hint. They are diagnostic variants
  (e.g. the foldStatic:false pair), extreme outliers (e.g. panda-props),
  or the hand-written ceiling (vanilla — not a real CSS-in-JS technique) hidden from the
  default view; the panel tells the cross-library story with shipped defaults. Citing one
  inside a finding as evidence ("with folding disabled the same case costs …", "ties
  vanilla") is fine — vanilla especially stays the comparison floor in prose.
- `provenance` as for the case files.

After writing all files, run `pnpm report` and confirm it prints the ✓ lines; then spot-check
that BENCHMARK.md contains an "### Analysis" section per case and a "## Key findings" section.
