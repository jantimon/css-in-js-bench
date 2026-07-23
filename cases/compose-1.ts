import type { CaseMeta } from "../report/types";

// Depth-sweep control for compose-3: the SAME kind of button, but authored as ONE
// styled component (the compose-3 base level standalone) — no wrapper chain at all.
// With compose-6 it brackets compose-3 so the report can chart how per-element cost
// grows with composition depth, the boundary that defeats next-yak's JSX folding.
export default {
  label: "Composition — 1 level (control)",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "The compose-3 button family at depth 1: one styled component carrying only the base styles, no " +
    "wrapper chain. Brackets compose-3 from below (compose-6 brackets it from above) to chart how " +
    "per-element cost grows with composition depth — the boundary that defeats next-yak's JSX folding.",
} satisfies CaseMeta;
