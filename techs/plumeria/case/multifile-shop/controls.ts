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
    color: "oklch(70.7% 0.022 261.325)",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 9999,
    transition: "color 0.15s ease",
    ":hover": {
      color: "oklch(63.7% 0.237 25.331)"
    },
    [media.reduce]: {
      transition: "none"
    }
  },
  wishlistOn: {
    color: "oklch(63.7% 0.237 25.331)"
  },
  addToCart: {
    position: "relative",
    padding: "8px 12px",
    marginTop: "auto",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "oklch(54.6% 0.245 262.881)",
    borderRadius: 6,
    transition: "background-color 0.15s ease",
    ":hover:not(:disabled)": {
      backgroundColor: "oklch(48.8% 0.243 264.376)"
    },
    [media.desktop]: {
      padding: "9px 12px"
    },
    [media.reduce]: {
      transition: "none"
    }
  },
  addToCartDisabled: {
    color: "oklch(55.1% 0.027 264.364)",
    cursor: "not-allowed",
    backgroundColor: "oklch(87.2% 0.01 258.338)"
  },
});
