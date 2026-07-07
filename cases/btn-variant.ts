import type { CaseMeta } from "../report/types";

// A design-system button cycling through a handful of variant + state combinations,
// so only ~12 distinct class strings ever appear. Low cardinality → whole-string
// mergers hit their cache almost every time. The harness renders one button per
// instance, deriving the variant combo from the index.
export default {
  label: "Variant / state button",
  group: "1-variants",
  n: 1000,
  cardinality: "low",
  description:
    "A button rendered 1,000× cycling ~12 distinct class strings (variant × active × fullWidth). " +
    "With so few repeated strings almost every cn() is a cache hit (nearly free), while wrapper-component " +
    "libraries still run their machinery per instance — the case where a cached merger is hard to beat.",
} satisfies CaseMeta;
