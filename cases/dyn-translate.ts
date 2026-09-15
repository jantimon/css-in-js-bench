import type { CaseMeta } from "../report/types";

// 1,000 elements, each with a DIFFERENT translateX value — HIGH cardinality: every
// instance is unique, so there is nothing to cache. The render fn derives the value
// from the index (the spec's dynamic render(i) contract). The common Tailwind trap is
// to bake the number into the class name (translate-x-[123px]) → a brand-new class
// every render; next-yak/styled turn it into a CSS variable, so their work is constant.
//
// The Panda and Bamboo lanes sit this one out, on their authors' own reading: both
// resolve names at build time and emit no rule for a value that exists only at render.
// Bamboo says so as a design position and delegates such values to `style=`, which is
// what dyn-fair asks for — so the naive path is not a thing either library does.
export default {
  label: "Dynamic value — translateX (the naive way)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "1,000 elements each with a unique translateX. Baking the value into the class name produces a " +
    "brand-new class string every render that a merger can't cache, and styled-components emits a CSS rule " +
    "per value — while next-yak turns it into a CSS variable, so its per-instance work stays constant. The " +
    "Panda and Bamboo lanes sit this one out: both resolve names at build time and emit no rule for a " +
    "render-time value, delegating it to an inline style instead — which is what dyn-fair measures.",
} satisfies CaseMeta;
