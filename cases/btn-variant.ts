import type { CaseMeta } from "../report/types";

// A design-system button cycling through a handful of variant + state combinations,
// so only ~12 distinct class strings ever appear. Low cardinality → whole-string
// mergers hit their cache almost every time. The harness renders one button per
// instance, deriving the variant combo from the index.
export default {
  label: "Button with variants — 1,000 buttons",
  group: "1-variants",
  n: 1000,
  cardinality: "low",
  description:
    "One button with a variant, an active state and a full-width option, rendered 1,000 times. Only about 12 different class combinations appear, so libraries that cache class strings reuse almost every result, while component-based libraries still do their work for each button.",
} satisfies CaseMeta;
