// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// Longhand border-* on purpose: StyleX drops the `border` shorthand silently, and
// each level below overrides only the colour.
export const ghostStyles = stylex.create({
  ghost: {
    backgroundColor: "transparent",
    borderColor: "#d1d5db",
    color: "#374151",
  },
});
