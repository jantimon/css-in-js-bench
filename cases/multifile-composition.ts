import type { CaseMeta } from "../report/types";

// The tabs workload with a module boundary: the styled primitives live in an
// imported parts.tsx, the way a design system ships components.
export default {
  label: "Tabs — split across files",
  group: "4-screens",
  n: 150,
  cardinality: "low",
  description:
    "The same 150 tab groups as in “Tabs — 150 tab groups” above, but with the styled parts in a separate file. Build tools compile one file at a time, so some performance optimizations do not work across files. In a real project, developers rarely put all code into one file, so this example uses several files to show how each CSS approach performs.",
  note: "identical to tabs except for the module boundary",
} satisfies CaseMeta;
