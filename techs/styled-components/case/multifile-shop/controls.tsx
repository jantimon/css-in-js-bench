import { css, styled } from "styled-components";
import { Button } from "./button";
import { desktop } from "./tokens";

// The two tap targets, each EXTENDING the imported base button — the pattern a real
// design system ships.

export const Wishlist = styled(Button)<{ $on: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  line-height: 1;
  padding: 4px;
  color: oklch(70.7% 0.022 261.325);
  transition: color 0.15s ease;
  @media (hover: hover) {
    &:hover {
      color: oklch(63.7% 0.237 25.331);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  ${({ $on }) => $on && css`color: oklch(63.7% 0.237 25.331);`}
`;

export const AddToCart = styled(Button)<{ $disabled: boolean }>`
  margin-top: auto;
  position: relative;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: oklch(54.6% 0.245 262.881);
  transition: background-color 0.15s ease;
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: oklch(48.8% 0.243 264.376);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  ${desktop} {
    padding: 9px 12px;
  }
  ${({ $disabled }) =>
    $disabled &&
    css`
      background: oklch(87.2% 0.01 258.338);
      color: oklch(55.1% 0.027 264.364);
      cursor: not-allowed;
    `}
`;
