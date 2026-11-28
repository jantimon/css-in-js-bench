import type { CaseMeta } from "../report/types";

// A base button extended into a ghost, then a ghost-primary — the variant ladder
// every design system grows. Here each of the three levels ships from its own module
// as a STYLE VALUE, and the page merges all three onto one element. No wrapper
// components: every lane composes the way it actually composes styles.
export default {
  label: "Button overrides — merged as style values",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "A base button, a ghost variant and a ghost-primary variant, each in its own file, merged onto one element. Each level overrides the background, border and text colour of the one before, so the library has to resolve conflicts, not just join class names. Compare with “Button overrides — wrapped as components”, which ships the same styles as components.",
  note: "same ladder, same three modules, as style values",
} satisfies CaseMeta;
