import type { CaseMeta } from "../report/types";

// Depth-sweep control for compose-3: the SAME kind of button, but authored as ONE
// styled component (the compose-3 base level standalone) — no wrapper chain at all.
// With compose-6 it brackets compose-3 so the report can chart how per-element cost
// grows with composition depth, the boundary that defeats @yak/react's JSX folding.
export default {
  label: "Composition depth — 1 level",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "A single styled button with no wrappers. With the 3- and 6-level cases it shows how cost grows as components wrap each other.",
} satisfies CaseMeta;
