import type { CaseMeta } from "../report/types";

// Depth-sweep upper bracket for compose-3: the same chain extended three more levels
// (L3–L5), each adding one small border-left/padding-left declaration exactly like
// compose-3's L1/L2 do. With compose-1 it brackets compose-3 so the report can chart
// how per-element cost grows with composition depth, the boundary that defeats
// next-yak's JSX folding.
export default {
  label: "Composition — 6 levels",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "The compose-3 button family at depth 6: the same base button wrapped five times, each level adding " +
    "one small border-left/padding-left declaration. Brackets compose-3 from above (compose-1 brackets it " +
    "from below) to chart how per-element cost grows with composition depth — the boundary that defeats " +
    "next-yak's JSX folding.",
} satisfies CaseMeta;
