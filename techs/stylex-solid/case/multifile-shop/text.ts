// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

import { media } from "./tokens.stylex";

// Copy, rating and price bundles. Declarations only — no JSX use site lives here.
export const textStyles = stylex.create({
  badge: {
    position: "absolute",
    top: "6px",
    left: "6px",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "#f59e0b",
  },
  badgeHigh: { backgroundColor: "#dc2626" },
  title: {
    margin: "8px 0 4px",
    fontSize: { default: "14px", [media.desktop]: "15px", [media.wide]: "16px" },
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rating: {
    height: "8px",
    borderRadius: "4px",
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  ratingFill: { height: "100%", backgroundColor: "#fbbf24" },
  fillW: (pct: number) => ({ width: `${pct}%` }),
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: { default: "6px", [media.wide]: "10px" },
    margin: "6px 0 10px",
  },
  oldPrice: { fontSize: "12px", color: "#9ca3af", textDecoration: "line-through" },
  nowPrice: { fontSize: "16px", fontWeight: 700, color: "#111827" },
});
