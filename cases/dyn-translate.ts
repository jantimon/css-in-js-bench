import type { CaseMeta } from "../report/types";

// 1,000 elements, each with a DIFFERENT translateX value — HIGH cardinality: every
// instance is unique, so there is nothing to cache. The render fn derives the value
// from the index (the spec's dynamic render(i) contract). The common Tailwind trap is
// to bake the number into the class name (translate-x-[123px]) → a brand-new class
// every render; next-yak/styled turn it into a CSS variable, so their work is constant.
//
// The Panda lanes sit this one out. Panda resolves names at build time and does not
// emit a rule for a value that only exists at render, so the case asks for something
// the library is not for — its author's own reading.
export default {
  label: "Dynamic value — translateX (the naive way)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "1,000 elements each with a unique translateX. Baking the value into the class name produces a " +
    "brand-new class string every render that a merger can't cache, and styled-components emits a CSS rule " +
    "per value — while next-yak turns it into a CSS variable, so its per-instance work stays constant. The " +
    "Panda lanes sit this one out: Panda resolves names at build time and emits no rule for a render-time value.",
} satisfies CaseMeta;
