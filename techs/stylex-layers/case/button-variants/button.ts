// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// Longhand border-* on purpose: StyleX drops the `border` shorthand silently, and
// each level below overrides only the colour.
export const buttonStyles = stylex.create({
  base: {
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
    backgroundColor: "#2563eb",
    color: "#fff",
  },
});
