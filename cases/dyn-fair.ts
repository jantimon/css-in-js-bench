import type { CaseMeta } from "../report/types";

// Same workload as dyn-translate (1,000 unique translateX values), but every lane
// uses its documented best practice for the value. The value is one no build step can
// know: a position from a database record, or from a user interaction such as drag
// and drop. Lanes whose styles are fixed at build time pass it as an inline style over
// a static class; StyleX uses its dynamic style function. The next-yak lanes write the
// same plain inline style, for comparison only: their own path is the function
// interpolation compiled to a CSS variable, which dyn-translate already measures, so
// the gap between the two cases for those lanes is what the CSS-variable path costs.
export default {
  label: "Dynamic value — translateX (each lane's best practice)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "The same 1,000-unique-translateX workload as the direct case, but idiomatic. The value is one no build " +
    "step can know, such as a position from a database record or from a drag-and-drop interaction. Lanes " +
    "whose styles are fixed at build time pass it as an inline style over a static class, their documented " +
    "answer to such values; StyleX uses its dynamic style function. The next-yak lanes write the same plain " +
    "inline style here for comparison only: their own path, the interpolation compiled to a CSS variable, " +
    "is what dyn-translate measures, so the gap between the two cases for those lanes is what that path " +
    "costs. Compare with dyn-translate to see what the direct pattern costs each ecosystem.",
} satisfies CaseMeta;
