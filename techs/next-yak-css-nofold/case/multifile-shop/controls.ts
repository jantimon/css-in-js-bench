import { css } from "next-yak";
import { desktop } from "./tokens";

// The two tap targets. Their shared border/cursor come from the imported base
// button fragment; the page interpolates both onto the host tag.
// The $-prop closures cannot live here: the css prop resolves them against component
// scope, so the dynamic halves stay in index.tsx.

export const wishlist = css`
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
`;

export const addToCart = css`
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
`;
