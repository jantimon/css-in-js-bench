import type { CaseMeta } from "../report/types";

// The tabs workload with a module boundary: the styled primitives live in an
// imported parts.tsx, the way a design system ships components.
export default {
  label: "Tabs — split across files",
  group: "4-screens",
  n: 150,
  cardinality: "low",
  description:
    "The same tabs, but the styled parts live in a separate file, the way a design system ships them. Compilers that optimise one file at a time cannot see across the import; runtime libraries do not care. The difference to the tabs case is the cost of that file boundary.",
  note: "identical to tabs except for the module boundary",
} satisfies CaseMeta;
