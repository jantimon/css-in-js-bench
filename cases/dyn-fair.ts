import type { CaseMeta } from "../report/types";

// Same workload as dyn-translate (1,000 unique translateX values), but every lane
// uses its documented best practice for a truly dynamic value instead of the naive
// pattern. Lanes without native dynamic-value support pass the value as an inline
// style over a static class; next-yak keeps its CSS-variable path and StyleX its
// dynamic style function.
export default {
  label: "Dynamic value — translateX (each lane's best practice)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "The same 1,000-unique-translateX workload as the naive case, but idiomatic: lanes without native " +
    "dynamic-value support pass the value as an inline style over a static class (their documented answer " +
    "to high-cardinality dynamic values), while next-yak keeps its CSS-variable path and StyleX its dynamic " +
    "style function. Compare with dyn-translate to see what the naive pattern costs each ecosystem.",
} satisfies CaseMeta;
