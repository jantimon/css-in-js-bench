// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// Longhand border-* on purpose: StyleX drops the `border` shorthand silently, and
// each level below overrides only the colour.
export const ghostPrimaryStyles = stylex.create({
  ghostPrimary: {
    borderColor: "oklch(54.6% 0.245 262.881)",
    color: "oklch(54.6% 0.245 262.881)",
  },
});
