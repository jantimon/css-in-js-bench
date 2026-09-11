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
    color: { default: "#9ca3af", ":hover": "#ef4444" },
    transition: { default: "color 0.15s ease", [media.reduce]: "none" },
  },
  wishlistOn: { color: "#ef4444" },
  addToCart: {
    marginTop: "auto",
    position: "relative",
    borderRadius: "6px",
    padding: { default: "8px 12px", [media.desktop]: "9px 12px" },
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: { default: "#2563eb", ":hover:not(:disabled)": "#1d4ed8" },
    transition: { default: "background-color 0.15s ease", [media.reduce]: "none" },
  },
  addToCartDisabled: {
    backgroundColor: "#d1d5db",
    color: "#6b7280",
    cursor: "not-allowed",
  },
});
