import type { CaseMeta } from "../report/types";

// The tabs workload with a module boundary: the styled primitives live in an
// imported parts.tsx, the way a design system ships components.
export default {
  label: "Multi-file composition — imported styled primitives",
  group: "4-screens",
  n: 150,
  cardinality: "low",
  description:
    "The EXACT Tabs workload — identical DOM, identical CSS — but the styled primitives are moved " +
    "to an imported parts.tsx module, the way a design system ships components. Per-module " +
    "compile-time optimizations such as next-yak's JSX folding cannot see across the module " +
    "boundary, while runtime libraries do not care about file layout. Any gap between this case " +
    "and tabs is the cost of that boundary.",
  note: "identical to tabs except for the module boundary",
} satisfies CaseMeta;
