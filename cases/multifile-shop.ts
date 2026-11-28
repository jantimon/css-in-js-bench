import type { CaseMeta } from "../report/types";

// The product-grid workload laid out the way a design system ships: shared style
// fragments in tokens.ts, the styled primitives split by role across button.tsx /
// layout.tsx / controls.tsx / text.tsx, and every JSX use site in index.tsx. No
// primitive module contains a use site — the opposite of multifile-composition,
// which moves declarations and use sites together and so keeps its folds.
export default {
  label: "Shop page — split across files",
  group: "4-screens",
  n: 400,
  cardinality: "low",
  description:
    "The same 400 product cards as the shop page, organised like a real codebase: shared styles in one file, the building blocks in several more and the page in another. A compiler can only swap a styled component for a plain HTML tag when both sit in the same file, so here it never can. The difference to the shop page is the cost of splitting code into files.",
  note: "identical to product-grid except for the file layout",
} satisfies CaseMeta;
