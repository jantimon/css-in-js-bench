import type { CaseMeta } from "../report/types";

// Same workload as dyn-translate (1,000 unique translateX values), but every lane
// uses its documented best practice for the value. The value is one no build step can
// know: a position from a database record, or from a user interaction such as drag
// and drop. Lanes whose styles are fixed at build time pass it as an inline style over
// a static class; StyleX uses its dynamic style function. The yak-react lanes write the
// same plain inline style, for comparison only: their own path is the function
// interpolation compiled to a CSS variable, which dyn-translate already measures, so
// the gap between the two cases for those lanes is what the CSS-variable path costs.
export default {
  label: "Dynamic values — each library's recommended way",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "The same 1,000 render-time translateX values, written the way each library recommends: build-time libraries put an inline style on top of a static class, StyleX uses its dynamic style function. @yak/react also uses a plain inline style here, so comparing with “Dynamic values — written directly” shows what its CSS-variable path costs.",
} satisfies CaseMeta;
