// @ts-nocheck
import { createStyles } from "../../coulis";

import { buttonBase } from "./button";
import { focusRing, minTarget } from "./tokens";

// The two tap targets. Their shared border/cursor come from the imported base button,
// merged ahead of their own declarations.
const wishlistBase = `${createStyles({
  ...buttonBase,
  position: "absolute",
  top: 6,
  right: 6,
  borderRadius: 9999,
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  fontSize: 18,
  lineHeight: 1,
  padding: 4,
  transition: { base: "color 0.15s ease", reduce: "none" },
})} ${focusRing} ${minTarget}`;
export const wishlist = `${wishlistBase} ${createStyles({ color: { base: "#9ca3af", hover: "#ef4444" } })}`;
export const wishlistOn = `${wishlistBase} ${createStyles({ color: "#ef4444" })}`;
const addToCartStyles = {
  ...buttonBase,
  marginTop: "auto",
  position: "relative",
  borderRadius: 6,
  padding: { base: "8px 12px", desktop: "9px 12px" },
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: { base: "#2563eb", hoverEnabled: "#1d4ed8" },
  transition: { base: "background-color 0.15s ease", reduce: "none" },
};
export const addToCart = `${createStyles(addToCartStyles)} ${focusRing} ${minTarget}`;
export const addToCartDisabled = `${createStyles({
  ...addToCartStyles,
  backgroundColor: "#d1d5db",
  color: "#6b7280",
  cursor: "not-allowed",
})} ${focusRing} ${minTarget}`;
