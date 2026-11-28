import type { CaseMeta } from "../report/types";

// A real design-system Tabs component — the most complex CSS in the suite. The
// harness renders ONE tab group per instance, N times.
export default {
  label: "Tabs — 150 tab groups",
  group: "4-screens",
  n: 150,
  cardinality: "low",
  description:
    "A design-system tabs component: responsive text, every hover, focus, active and disabled state, an animated underline using CSS anchor positioning, large tap targets, a scrollable tab bar and a full-width variant. With Tailwind each tab carries about 40 classes, and @yak/react compiles all of it at build time.",
  note: "the most complex CSS in the suite",
} satisfies CaseMeta;
