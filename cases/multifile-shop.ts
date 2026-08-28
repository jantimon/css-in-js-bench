import type { CaseMeta } from "../report/types";

// The product-grid workload laid out the way a design system ships: shared style
// fragments in tokens.ts, the styled primitives split by role across button.tsx /
// layout.tsx / controls.tsx / text.tsx, and every JSX use site in index.tsx. No
// primitive module contains a use site — the opposite of multifile-composition,
// which moves declarations and use sites together and so keeps its folds.
export default {
  label: "A whole shop page — the same tiles, split across files",
  group: "4-screens",
  n: 400,
  cardinality: "low",
  description:
    "The EXACT product-grid workload — identical DOM, identical CSS, identical 400 tiles — laid out " +
    "the way real code ships: the shared fragments in one module, the primitives split by role across " +
    "several more, and every use site in index.tsx. A compiler can only replace a styled component " +
    "with a plain tag when the declaration and the use site sit in the same module, so here it never " +
    "can, and the shared fragments have to cross a module boundary to reach the components that use " +
    "them. Runtime libraries do not care about file layout. The gap to product-grid is what the " +
    "boundary costs.",
  note: "identical to product-grid except for the file layout",
} satisfies CaseMeta;
