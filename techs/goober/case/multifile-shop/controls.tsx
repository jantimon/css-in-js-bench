import { styled } from "goober";
import "./setup";
import { Button } from "./button";
import { css, desktop } from "./tokens";

// The two tap targets, each EXTENDING the imported base button — the pattern a real
// design system ships.

export const Wishlist = styled<{ $on: boolean }>(Button)`
  position: absolute;
  top: 6px;
  right: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  line-height: 1;
  padding: 4px;
  color: #9ca3af;
  transition: color 0.15s ease;
  @media (hover: hover) {
    &:hover {
      color: #ef4444;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  ${({ $on }: { $on: boolean }) => $on && css`color: #ef4444;`}
`;

export const AddToCart = styled<{ $disabled: boolean }>(Button)`
  margin-top: auto;
  position: relative;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  transition: background-color 0.15s ease;
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: #1d4ed8;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  ${desktop} {
    padding: 9px 12px;
  }
  ${({ $disabled }: { $disabled: boolean }) =>
    $disabled &&
    css`
      background: #d1d5db;
      color: #6b7280;
      cursor: not-allowed;
    `}
`;
