// @ts-nocheck
import { css } from "styled-system/css";

// css.raw so `panda cssgen` extracts the atomic rules at the definition site — a
// runtime array threaded through props is not a statically readable shape.
export const ghostPrimaryButton = css.raw({
  borderColor: "#2563eb",
  color: "#2563eb",
});
