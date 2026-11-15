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
    backgroundColor: "oklch(76.9% 0.188 70.08)",
  },
  badgeHigh: { backgroundColor: "oklch(57.7% 0.245 27.325)" },
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
    backgroundColor: "oklch(92.8% 0.006 264.531)",
    overflow: "hidden",
  },
  ratingFill: { height: "100%", backgroundColor: "oklch(82.8% 0.189 84.429)" },
  fillW: (pct: number) => ({ width: `${pct}%` }),
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: { default: "6px", [media.wide]: "10px" },
    margin: "6px 0 10px",
  },
  oldPrice: { fontSize: "12px", color: "oklch(70.7% 0.022 261.325)", textDecoration: "line-through" },
  nowPrice: { fontSize: "16px", fontWeight: 700, color: "oklch(21% 0.034 264.665)" },
});
