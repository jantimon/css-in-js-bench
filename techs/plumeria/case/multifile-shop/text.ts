import * as css from "@plumeria/core";

import { media } from "./tokens.static";

// Copy, rating and price bundles. Declarations only — no JSX use site lives here.
export const textStyles = css.create({
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    padding: "2px 6px",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "oklch(76.9% 0.188 70.08)",
    borderRadius: 4
  },
  badgeHigh: {
    backgroundColor: "oklch(57.7% 0.245 27.325)"
  },
  title: {
    margin: "8px 0 4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: "nowrap",
    [media.desktop]: {
      fontSize: 15
    },
    [media.wide]: {
      fontSize: 16
    }
  },
  rating: {
    height: 8,
    overflow: "hidden",
    backgroundColor: "oklch(92.8% 0.006 264.531)",
    borderRadius: 4
  },
  ratingFill: {
    height: "100%",
    backgroundColor: "oklch(82.8% 0.189 84.429)"
  },
  fillW: (pct: number = 0) => ({
    width: `${pct}%`
  }),
  priceRow: {
    display: "flex",
    gap: 6,
    alignItems: "baseline",
    margin: "6px 0 10px",
    [media.wide]: {
      gap: 10
    }
  },
  oldPrice: {
    fontSize: 12,
    color: "oklch(70.7% 0.022 261.325)",
    textDecoration: "line-through"
  },
  nowPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: "oklch(21% 0.034 264.665)"
  },
});
