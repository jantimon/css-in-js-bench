import type { CaseMeta } from "../report/types";

// The button-variants ladder with the other module API: each of the three levels
// exports a JSX component wrapping the one below, so every lane pays for a real
// component chain and the page renders only the leaf.
export default {
  label: "Button overrides — wrapped as components",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "The same three styles as “Button overrides — merged as style values”, but each file exports a component that wraps the one before: GhostPrimaryButton renders GhostButton, which renders Button. The difference between the two cases is what the component API costs. The @yak/react css prop cannot pass styles through a component, so it is missing here.",
  note: "same ladder, same three modules, as JSX components",
} satisfies CaseMeta;
