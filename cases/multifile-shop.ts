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
    "The same 400 product cards as the shop page, split across several files the way real projects keep their code. Build tools compile one file at a time, so some performance optimizations do not work across files. This test page shows how each CSS approach performs when the code is split.",
  note: "identical to product-grid except for the file layout",
} satisfies CaseMeta;
