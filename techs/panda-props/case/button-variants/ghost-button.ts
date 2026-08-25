// @ts-nocheck
import { css } from "styled-system/css";

// css.raw so `panda cssgen` extracts the atomic rules at the definition site — a
// runtime array threaded through props is not a statically readable shape.
export const ghostButton = css.raw({
  background: "transparent",
  borderColor: "#d1d5db",
  color: "#374151",
});
