import type { CaseMeta } from "../report/types";

// A whole shop page rendered as N independent product tiles. Each tile mixes
// static + variant + dynamic + composed + responsive + accessible styling — the
// representative real-page blend. The harness renders ONE tile per instance, N times.
export default {
  label: "Shop page — 400 product cards",
  group: "4-screens",
  n: 400,
  cardinality: "low",
  description:
    "A product listing with what real shops need: a responsive grid, sale badges, wishlist buttons, star ratings, crossed-out prices, sold-out states, hover and focus styles, large tap targets, container queries and reduced motion. With Tailwind, each card merges its classes with cn() about 8 times.",
  note: "mixed static + variant + dynamic + composed; the closest thing to a real page",
} satisfies CaseMeta;
