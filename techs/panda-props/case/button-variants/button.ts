// @ts-nocheck
import { css } from "styled-system/css";

// css.raw so `panda cssgen` extracts the atomic rules at the definition site — a
// runtime array threaded through props is not a statically readable shape.
export const button = css.raw({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: "6px",
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "20px",
  cursor: "pointer",
  background: "#2563eb",
  color: "#fff",
});
