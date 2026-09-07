// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// StyleX can only read a constant across a module boundary when it is declared with
// defineConsts in a *.stylex.ts file — a plain exported string fails the build with
// "could not resolve the path to the imported file". This is that mechanism.
export const media = stylex.defineConsts({
  desktop: "@media (min-width: 992px)",
  coarse: "@media (hover: none) and (pointer: coarse)",
  fine: "@media (hover: hover) and (pointer: fine)",
  reduce: "@media (prefers-reduced-motion: reduce)",
  wide: "@container tile (min-width: 240px)",
});
