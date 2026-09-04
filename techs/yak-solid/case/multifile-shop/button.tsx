import { styled } from "@yak/solid";
import { focusRing, minTargetSize } from "./tokens";

// The base button every tap target in the tile is built from — exactly the four
// declarations Wishlist and AddToCart both carry in the single-file product-grid,
// so the computed CSS is unchanged and the two cases stay comparable.
export const Button = styled.button`
  border: none;
  cursor: pointer;
  ${focusRing}
  ${minTargetSize}
`;
