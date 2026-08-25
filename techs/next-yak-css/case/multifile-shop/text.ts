import { css } from "next-yak";
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
  background: #f59e0b;
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
  background: #e5e7eb;
  overflow: hidden;
`;

export const ratingFill = css`
  height: 100%;
  background: #fbbf24;
  width: var(--pct);
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
  color: #9ca3af;
  text-decoration: line-through;
`;

export const nowPrice = css`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
`;

export const srOnlyBox = css`
  ${srOnly}
`;
