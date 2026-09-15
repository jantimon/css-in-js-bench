// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// Longhand border-* on purpose: StyleX drops the `border` shorthand silently, and
// each level below overrides only the colour.
export const ghostPrimaryStyles = stylex.create({
  ghostPrimary: {
    borderColor: "#2563eb",
    color: "#2563eb",
  },
});
