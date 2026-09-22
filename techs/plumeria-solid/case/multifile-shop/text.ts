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
    backgroundColor: "#f59e0b",
    borderRadius: 4
  },
  badgeHigh: {
    backgroundColor: "#dc2626"
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
    backgroundColor: "#e5e7eb",
    borderRadius: 4
  },
  ratingFill: {
    height: "100%",
    backgroundColor: "#fbbf24"
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
    color: "#9ca3af",
    textDecoration: "line-through"
  },
  nowPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827"
  },
});
