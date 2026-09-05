import * as css from "@plumeria/core";

import { media } from "./tokens.static";

// The two tap targets. Their shared border/cursor now come from the imported base button,
// which the page merges in ahead of these.
export const controlsStyles = css.create({
  wishlist: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
    fontSize: 18,
    lineHeight: 1,
    color: "#9ca3af",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 9999,
    transition: "color 0.15s ease",
    [media.reduce]: {
      transition: "none"
    },
    ":hover": {
      color: "#ef4444"
    }
  },
  wishlistOn: {
    color: "#ef4444"
  },
  addToCart: {
    position: "relative",
    padding: "8px 12px",
    marginTop: "auto",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "#2563eb",
    borderRadius: 6,
    transition: "background-color 0.15s ease",
    [media.desktop]: {
      padding: "9px 12px"
    },
    [media.reduce]: {
      transition: "none"
    },
    ":hover:not(:disabled)": {
      backgroundColor: "#1d4ed8"
    }
  },
  addToCartDisabled: {
    color: "#6b7280",
    cursor: "not-allowed",
    backgroundColor: "#d1d5db"
  },
});
