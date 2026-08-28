import type { CaseMeta } from "../report/types";

// A base button extended into a ghost, then a ghost-primary — the variant ladder
// every design system grows. Here each of the three levels ships from its own module
// as a STYLE VALUE, and the page merges all three onto one element. No wrapper
// components: every lane composes the way it actually composes styles.
export default {
  label: "Button variants — composed as style values",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "A base button, a ghost override and a ghost-primary override, each exported from its own module " +
    "as a style value and merged onto ONE element by the page. Every level overrides the last " +
    "(background, border-colour, colour), so this measures conflict resolution, not concatenation: " +
    "tailwind-merge re-parses the whole list, StyleX and the atomic compilers resolve it at build time, " +
    "and the styled lanes serialise it once per class. Read against button-variants-nested, which ships " +
    "the identical ladder as a JSX component API.",
  note: "same ladder, same three modules, as style values",
} satisfies CaseMeta;
