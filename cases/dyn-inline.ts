import type { CaseMeta } from "../report/types";

// Control for dyn-fair: even next-yak drops its CSS-variable indirection and passes
// the transform as a plain inline style over a static class. The delta between this
// case and dyn-fair isolates what the CSS-variable path itself costs.
export default {
  label: "Dynamic value — translateX (inline-style control)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "Every lane — including next-yak — uses a static class plus a plain inline style for the unique " +
    "translateX. Paired with dyn-fair this isolates what next-yak's CSS-variable indirection itself costs.",
} satisfies CaseMeta;
