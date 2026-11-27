// @ts-nocheck
import { css } from "styled-system/css";

// The base button every tap target is built from — exactly the declarations the
// wishlist and add-to-cart styles both carry in the single-file product-grid, so the
// computed CSS is unchanged and the two cases stay comparable.
export const buttonBase = css({
  border: "none",
  cursor: "pointer",
});
