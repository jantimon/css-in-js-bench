import * as css from "@plumeria/core";

// The base button every tap target is built from — exactly the declarations the wishlist
// and add-to-cart bundles both carry in the single-file product-grid, so the computed CSS
// is unchanged and the two cases stay comparable.
export const buttonBase = css.create({
  base: {
    cursor: "pointer",
    borderWidth: 0
  },
});
