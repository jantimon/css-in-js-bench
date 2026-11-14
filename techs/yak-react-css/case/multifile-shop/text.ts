import { css } from "@yak/react";
import { desktop, srOnly } from "./tokens";

// Copy, rating and price fragments. Declarations only — no JSX use site lives here.

export const badge = css`
  position: absolute;
  top: 6px;
  left: 6px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: oklch(76.9% 0.188 70.08);
`;

export const title = css`
  margin: 8px 0 4px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${desktop} {
    font-size: 15px;
  }
  /* Wider columns get a slightly larger title. */
  @container tile (min-width: 240px) {
    font-size: 16px;
  }
`;

export const rating = css`
  height: 8px;
  border-radius: 4px;
  background: oklch(92.8% 0.006 264.531);
  overflow: hidden;
`;

// the width is per instance, so the tile sets it in place (a function interpolation
// the compiler turns into a CSS variable); the mixin holds the static part.
export const ratingFill = css`
  height: 100%;
  background: oklch(82.8% 0.189 84.429);
`;

export const priceRow = css`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0 10px;
  /* Roomier price row in wide columns. */
  @container tile (min-width: 240px) {
    gap: 10px;
  }
`;

export const oldPrice = css`
  font-size: 12px;
  color: oklch(70.7% 0.022 261.325);
  text-decoration: line-through;
`;

export const nowPrice = css`
  font-size: 16px;
  font-weight: 700;
  color: oklch(21% 0.034 264.665);
`;

export const srOnlyBox = css`
  ${srOnly}
`;
