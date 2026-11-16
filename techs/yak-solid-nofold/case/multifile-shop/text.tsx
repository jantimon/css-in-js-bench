import { css, styled } from "@yak/solid";
import { desktop, srOnly } from "./tokens";

// The copy, rating and price primitives. Declarations only — no JSX use site lives
// here. Third consumer of tokens.ts, alongside layout.tsx and button.tsx.

export const Badge = styled.span<{ $high: boolean }>`
  position: absolute;
  top: 6px;
  left: 6px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: oklch(76.9% 0.188 70.08);
  ${({ $high }) => $high && css`background: oklch(57.7% 0.245 27.325);`}
`;

export const Title = styled.h3`
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

export const Rating = styled.div`
  height: 8px;
  border-radius: 4px;
  background: oklch(92.8% 0.006 264.531);
  overflow: hidden;
`;

export const RatingFill = styled.div<{ $pct: number }>`
  height: 100%;
  background: oklch(82.8% 0.189 84.429);
  width: ${({ $pct }) => $pct}%;
`;

export const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0 10px;
  /* Roomier price row in wide columns. */
  @container tile (min-width: 240px) {
    gap: 10px;
  }
`;

export const OldPrice = styled.span`
  font-size: 12px;
  color: oklch(70.7% 0.022 261.325);
  text-decoration: line-through;
`;

export const NowPrice = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: oklch(21% 0.034 264.665);
`;

export const SrOnly = styled.span`
  ${srOnly}
`;
