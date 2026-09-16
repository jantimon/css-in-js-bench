import type { CaseMeta } from "../report/types";

// 1,000 elements, each with a DIFFERENT translateX value — HIGH cardinality: every
// instance is unique, so there is nothing to cache. The value stands in for one no
// build step can know: a position from a database record, or from a user interaction
// such as drag and drop. The render fn derives it from the index (the spec's dynamic
// render(i) contract) and writes it straight into the style declaration, the naive way. styled-components emits a rule per value; next-yak turns the
// value into a CSS variable, so its per-instance work stays constant.
//
// The build-time lanes sit this one out: Tailwind's scanner, Panda's extractor and
// Bamboo's compiler resolve names ahead of time and emit no rule for a value that
// exists only at render. Each of those lanes holds a not-compatible.md here that says
// so with a source. Their working path, an inline style, is what dyn-fair measures.
export default {
  label: "Dynamic value — translateX (the naive way)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "1,000 elements each with a unique translateX, a value no build step can know, such as a position from " +
    "a database record or from a drag-and-drop interaction, written the naive way: it goes straight into " +
    "the style declaration. styled-components emits a CSS rule per value, while next-yak turns it into a " +
    "CSS variable, so its per-instance work stays constant. The build-time lanes have no cell here: " +
    "Tailwind's scanner, Panda's extractor and Bamboo's compiler resolve names ahead of time and emit no " +
    "rule for a render-time value. Their working path, an inline style, is what dyn-fair measures.",
} satisfies CaseMeta;
