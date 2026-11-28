import type { CaseMeta } from "../report/types";

// The workload facts that MUST be identical across every tech (this is what makes
// the comparison fair) plus the "what & why" prose. No presentation here — the
// report owns ordering/sectioning (§5).
export default {
  label: "Production button — 1,000 buttons",
  group: "2-realistic",
  n: 1000,
  cardinality: "low",
  description:
    "A button taken from a real project: hover, focus, pressed and disabled states, a layout change at 992px, a large tap target, shared style pieces and an icon, rendered 1,000 times.",
} satisfies CaseMeta;
