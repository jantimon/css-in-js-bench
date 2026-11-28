import type { CaseMeta } from "../report/types";

// Depth-sweep upper bracket for compose-3: the same chain extended three more levels
// (L3–L5), each adding one small border-left/padding-left declaration exactly like
// compose-3's L1/L2 do. With compose-1 it brackets compose-3 so the report can chart
// how per-element cost grows with composition depth, the boundary that defeats
// @yak/react's JSX folding.
export default {
  label: "Composition depth — 6 levels",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "The same button wrapped five times, each level adding a small border and padding. Read it with the 1- and 3-level cases to see how cost grows with depth.",
} satisfies CaseMeta;
