// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

import { media } from "./tokens.stylex";

// The two tap targets. Their shared border/cursor now come from the imported base
// button, which the page merges in ahead of these.
export const controlsStyles = stylex.create({
  wishlist: {
    position: "absolute",
    top: "6px",
    right: "6px",
    borderRadius: "9999px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    fontSize: "18px",
    lineHeight: 1,
    padding: "4px",
    color: { default: "oklch(70.7% 0.022 261.325)", ":hover": "oklch(63.7% 0.237 25.331)" },
    transition: { default: "color 0.15s ease", [media.reduce]: "none" },
  },
  wishlistOn: { color: "oklch(63.7% 0.237 25.331)" },
  addToCart: {
    marginTop: "auto",
    position: "relative",
    borderRadius: "6px",
    padding: { default: "8px 12px", [media.desktop]: "9px 12px" },
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: { default: "oklch(54.6% 0.245 262.881)", ":hover:not(:disabled)": "oklch(48.8% 0.243 264.376)" },
    transition: { default: "background-color 0.15s ease", [media.reduce]: "none" },
  },
  addToCartDisabled: {
    backgroundColor: "oklch(87.2% 0.01 258.338)",
    color: "oklch(55.1% 0.027 264.364)",
    cursor: "not-allowed",
  },
});
