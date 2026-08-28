import type { CaseMeta } from "../report/types";

// The button-variants ladder with the other module API: each of the three levels
// exports a JSX component wrapping the one below, so every lane pays for a real
// component chain and the page renders only the leaf.
export default {
  label: "Button variants — composed as JSX components",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "The IDENTICAL ladder as button-variants — same declarations, same three modules, same rendered " +
    "element — but each module exports a component instead of a style value: GhostPrimaryButton wraps " +
    "GhostButton wraps Button. next-yak collapses the chain at construction, so three levels stay one " +
    "React element; the runtime and utility lanes render three components and re-merge at every level. " +
    "The gap to button-variants is what the component API costs, with the file layout held constant. " +
    "The next-yak css-prop lanes have no cell here: the css prop resolves only top-scope values, so a " +
    "style fragment cannot reach a component through a prop — that API composes fragments at build time " +
    "or not at all.",
  note: "same ladder, same three modules, as JSX components",
} satisfies CaseMeta;
