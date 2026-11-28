import type { CaseMeta } from "../report/types";

// The tabs workload with a module boundary: the styled primitives live in an
// imported parts.tsx, the way a design system ships components.
export default {
  label: "Tabs — split across files",
  group: "4-screens",
  n: 150,
  cardinality: "low",
  description:
    "The same 150 tab groups as the tabs page, with the styled parts in a separate file the way a design system ships them. Build tools compile one file at a time, so some performance optimizations do not work across files. This test page shows how each CSS approach performs when the code is split.",
  note: "identical to tabs except for the module boundary",
} satisfies CaseMeta;
