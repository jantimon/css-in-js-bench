// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// Longhand border-* on purpose: StyleX drops the `border` shorthand silently, and
// each level below overrides only the colour.
export const ghostStyles = stylex.create({
  ghost: {
    backgroundColor: "transparent",
    borderColor: "oklch(87.2% 0.01 258.338)",
    color: "oklch(37.3% 0.034 259.733)",
  },
});
