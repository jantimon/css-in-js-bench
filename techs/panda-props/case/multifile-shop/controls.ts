// @ts-nocheck

// The two tap targets. Their shared border/cursor now come from the imported base
// button, which the page spreads in ahead of these.

export const wishlist = {
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
} as const;

export const wishlistCss = {
  "@media (hover: hover)": {
    _hover: {
      color: "#ef4444",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
} as const;

export const addToCart = {
  marginTop: "auto",
  position: "relative",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#fff",
  background: "#2563eb",
  transition: "background-color 0.15s ease",
} as const;

export const addToCartCss = {
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
} as const;
