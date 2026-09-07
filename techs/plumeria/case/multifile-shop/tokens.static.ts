import * as css from "@plumeria/core";

// Plumeria reads a constant across a module boundary when it is declared with
// css.createStatic — the mechanism that exists for exactly this (StyleX needs
// defineConsts in a *.stylex.ts file for the same reason).
export const media = css.createStatic({
  desktop: "@media (min-width: 992px)",
  coarse: "@media (hover: none) and (pointer: coarse)",
  fine: "@media (hover: hover) and (pointer: fine)",
  reduce: "@media (prefers-reduced-motion: reduce)",
  wide: "@container tile (min-width: 240px)",
});
