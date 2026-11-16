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
  color: "oklch(70.7% 0.022 261.325)",
  transition: "color 0.15s ease",
  "@media (hover: hover)": {
    _hover: {
      color: "oklch(63.7% 0.237 25.331)",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

export const wishlistOn = css({ color: "oklch(63.7% 0.237 25.331)" });

export const addToCart = css({
  marginTop: "auto",
  _disabled: { background: "oklch(87.2% 0.01 258.338)", color: "oklch(55.1% 0.027 264.364)", cursor: "not-allowed" },
  position: "relative",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#fff",
  background: "oklch(54.6% 0.245 262.881)",
  transition: "background-color 0.15s ease",
  "@media (hover: hover)": {
    "&:hover:not(:disabled)": {
      background: "oklch(48.8% 0.243 264.376)",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
  "@media (min-width: 992px)": {
    padding: "9px 12px",
  },
});
