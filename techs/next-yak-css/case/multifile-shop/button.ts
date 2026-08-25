import { css } from "next-yak";
import { focusRing, minTargetSize } from "./tokens";

// The base button fragment every tap target is built from — exactly the declarations
// the two controls both carry in the single-file product-grid, so the computed CSS is
// unchanged and the two cases stay comparable.
export const button = css`
  border: none;
  cursor: pointer;
  ${focusRing}
  ${minTargetSize}
`;
