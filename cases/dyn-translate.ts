import type { CaseMeta } from "../report/types";

// 1,000 elements, each with a DIFFERENT translateX value — HIGH cardinality: every
// instance is unique, so there is nothing to cache. The value stands in for one no
// build step can know: a position from a database record, or from a user interaction
// such as drag and drop. The render fn derives it from the index (the spec's dynamic
// render(i) contract) and writes it straight into the style declaration, the direct way:
// the value goes where the library's API takes it, whether or not that is what the
// library is good at. styled-components emits a rule per value; @yak/react turns the
// value into a CSS variable, so its per-instance work stays constant.
//
// The build-time lanes sit this one out: Tailwind's scanner, Panda's extractor and
// Bamboo's compiler resolve names ahead of time and emit no rule for a value that
// exists only at render. Each of those lanes holds a not-compatible.md here that says
// so with a source. Their working path, an inline style, is what dyn-fair measures.
export default {
  label: "Dynamic values — written directly",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "1,000 elements, each moved by a different translateX that is only known at render time, such as a position from a database or a drag. The value goes straight into each library's style API: styled-components creates a CSS rule per value, @yak/react turns it into a CSS variable. Build-time libraries such as Tailwind, Panda and Bamboo cannot create CSS for a value they never see, so they appear only in “Dynamic values — each library's recommended way”.",
} satisfies CaseMeta;
