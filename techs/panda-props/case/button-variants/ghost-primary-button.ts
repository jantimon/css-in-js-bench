// @ts-nocheck
import { css } from "styled-system/css";

// css.raw so `panda cssgen` extracts the atomic rules at the definition site — a
// runtime array threaded through props is not a statically readable shape.
export const ghostPrimaryButton = css.raw({
  borderColor: "oklch(54.6% 0.245 262.881)",
  color: "oklch(54.6% 0.245 262.881)",
});
