import type { CaseMeta } from "../report/types";

// 1,000 elements, each with a DIFFERENT translateX value — HIGH cardinality: every
// instance is unique, so there is nothing to cache. The render fn derives the value
// from the index (the spec's dynamic render(i) contract). The common Tailwind trap is
// to bake the number into the class name (translate-x-[123px]) → a brand-new class
// every render; next-yak/styled turn it into a CSS variable, so their work is constant.
export default {
  label: "Dynamic value — translateX (the naive way)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "1,000 elements each with a unique translateX. Baking the value into the class name produces a " +
    "brand-new class string every render that a merger can't cache, and styled-components emits a CSS rule " +
    "per value — while next-yak/Panda turn it into a CSS variable, so their per-instance work stays constant.",
} satisfies CaseMeta;
