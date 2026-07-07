import type { CaseMeta } from "../report/types";

// The workload facts that MUST be identical across every tech (this is what makes
// the comparison fair) plus the "what & why" prose. No presentation here — the
// report owns ordering/sectioning (§5).
export default {
  label: "A real component — the DenseButton",
  group: "2-realistic",
  n: 1000,
  cardinality: "low",
  description:
    "A real-project button with pseudo-states (:hover/:focus-visible/:active/:disabled), " +
    "a 992px responsive flip, a ::before WCAG target-size, composed style fragments and an " +
    "icon child — rendered 1,000×. Not a toy 4-class button: this is what real buttons cost.",
} satisfies CaseMeta;
