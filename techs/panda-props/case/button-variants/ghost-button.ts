// @ts-nocheck
import { css } from "styled-system/css";

// css.raw so `panda cssgen` extracts the atomic rules at the definition site — a
// runtime array threaded through props is not a statically readable shape.
export const ghostButton = css.raw({
  background: "transparent",
  borderColor: "oklch(87.2% 0.01 258.338)",
  color: "oklch(37.3% 0.034 259.733)",
});
