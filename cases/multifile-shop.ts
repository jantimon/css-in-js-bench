import type { CaseMeta } from "../report/types";

// The product-grid workload laid out the way a design system ships: shared style
// fragments in tokens.ts, the styled primitives split by role across layout.tsx /
// controls.tsx / text.tsx, and every JSX use site in index.tsx. No primitive module
// contains a use site — the opposite of multifile-composition, which moves
// declarations and use sites together and so keeps its folds.
export default {
  label: "A whole shop page — split across five files",
  group: "4-screens",
  n: 400,
  cardinality: "low",
  description:
    "The EXACT product-grid workload — identical DOM, identical CSS, identical 400 tiles — laid out " +
    "across five files the way real code ships: shared fragments in tokens.ts, the primitives split by " +
    "role over layout/controls/text, and every use site in index.tsx. A compiler can only fold a styled " +
    "component into a plain tag where the declaration and the use site share a module, so here it folds " +
    "nothing, and the shared fragments now fan out to three consumer modules instead of one. Runtime " +
    "libraries do not care about file layout. The gap to product-grid is what the boundary costs.",
  note: "identical to product-grid except for the file layout",
} satisfies CaseMeta;
