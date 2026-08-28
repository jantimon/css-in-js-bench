// @ts-nocheck

// The base button every tap target is built from — exactly the props the wishlist and
// add-to-cart bundles both carry in the single-file product-grid, so the computed CSS
// is unchanged and the two cases stay comparable.
export const buttonBase = {
  border: "none",
  cursor: "pointer",
} as const;
