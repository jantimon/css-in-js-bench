import type { CaseMeta } from "../report/types";

// A whole shop page rendered as N independent product tiles. Each tile mixes
// static + variant + dynamic + composed + responsive + accessible styling — the
// representative real-page blend. The harness renders ONE tile per instance, N times.
export default {
  label: "A whole shop page — 400 product tiles",
  group: "4-screens",
  n: 400,
  cardinality: "low",
  description:
    "A real product listing: responsive grid, a sale badge (color by discount), a wishlist toggle, " +
    "a truncated title, a dynamic rating bar, optional struck-through price and an out-of-stock " +
    "add-to-cart — plus (hover:hover)-guarded hover, :focus-visible rings, WCAG ::before tap targets, " +
    "a @container query per tile, reduced-motion handling and a11y semantics. Tailwind fires ~8 cn() per tile.",
  note: "mixed static + variant + dynamic + composed; the closest thing to a real page",
} satisfies CaseMeta;
