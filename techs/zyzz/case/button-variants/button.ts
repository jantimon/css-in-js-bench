import { style } from "../../zyzz.config";

/** The base button, exported as a style value. */
export const button = style({
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
  fontWeight: 600,
  lineHeight: "20px",
  cursor: "pointer",
  background: "#2563eb",
  color: "#fff",
});
