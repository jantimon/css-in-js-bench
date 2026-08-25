// @ts-nocheck
import { css } from "styled-system/css";

// The two tap targets. Their shared border/cursor now come from the imported base
// button, which the page merges in alongside these.

export const wishlist = css({
  position: "absolute",
  top: "6px",
  right: "6px",
  borderRadius: "9999px",
  background: "rgba(255, 255, 255, 0.8)",
  fontSize: "18px",
  lineHeight: "1",
  padding: "4px",
  color: "#9ca3af",
  transition: "color 0.15s ease",
  "@media (hover: hover)": {
    _hover: {
      color: "#ef4444",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

export const wishlistOn = css({ color: "#ef4444" });

export const addToCart = css({
  marginTop: "auto",
  position: "relative",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#fff",
  background: "#2563eb",
  transition: "background-color 0.15s ease",
  "@media (hover: hover)": {
    "&:hover:not(:disabled)": {
      background: "#1d4ed8",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
  "@media (min-width: 992px)": {
    padding: "9px 12px",
  },
});

export const addToCartDisabled = css({
  background: "#d1d5db",
  color: "#6b7280",
  cursor: "not-allowed",
});
