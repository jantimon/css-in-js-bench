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
    "The same 400 product cards as in “Shop page — 400 product cards” above, but split across several files. Build tools compile one file at a time, so some performance optimizations do not work across files. In a real project, developers rarely put all code into one file, so this example uses several files to show how each CSS approach performs.",
  note: "identical to product-grid except for the file layout",
} satisfies CaseMeta;
