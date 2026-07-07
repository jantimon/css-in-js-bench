import type { CaseMeta } from "../report/types";

// A real design-system Tabs component — the most complex CSS in the suite. The
// harness renders ONE tab group per instance, N times.
export default {
  label: "A real Tabs component — 150 groups",
  group: "4-screens",
  n: 150,
  cardinality: "low",
  description:
    "A real design-system Tabs: responsive typography, the full active/hover/focus-visible/disabled " +
    "state matrix, an animated active underline via CSS anchor positioning (with a per-tab ::after " +
    "fallback gated on @supports), a ::before WCAG tap target, hidden-scrollbar overflow and a composed " +
    "FullWidthTabs wrapper. Tailwind needs a ~40-token list per tab; next-yak compiles it all at build time.",
  note: "the most complex CSS in the suite",
} satisfies CaseMeta;
