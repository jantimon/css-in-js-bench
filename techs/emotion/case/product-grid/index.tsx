// Emotion — the product-grid tile. Identical CSS to every other lane; the
// difference is the runtime: Emotion resolves these nested rules and injects CSS
// at render. Default-exports a single-instance render(i) (§6); the harness loops
// it. product-grid builds ONE tile from i (same formula as the old 400-item
// ITEMS array).
import React, { type FunctionComponent } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";

// `$`-prefixed props are transient (the styled-components convention this shared template
// uses); emotion forwards every prop to the DOM by default, so strip them per component.
const transient = { shouldForwardProp: (p: string) => p[0] !== "$" };

// A realistic shop page: 400 product tiles, each composed of ~11 elements that
// mix static styles, conditional variants (sale badge, wishlist, stock), a
// dynamic value (the rating bar width) AND the things real production tiles
// actually ship: a responsive grid, hover guarded behind (hover: hover),
// :focus-visible rings for keyboard users, WCAG min-target-size ::before
// pseudo-elements on the tap targets, reduced-motion handling, and proper
// a11y semantics (role="img" rating, aria-pressed wishlist, sr-only labels).
// This is the "whole page" case — the way real product listings look.

// --- shared layers ---------------------------------------------------------

const desktop = "@media (min-width: 992px)";

/** Visually-hidden, still read by screen readers. */
const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/** WCAG 2.5.5 minimum target size — grows the hit area without changing layout. */
const minTargetSize = css`
  &::before {
    content: "";
    position: absolute;
    inset: 50%;
    translate: -50% -50%;
    width: 100%;
    height: 100%;
  }
  @media (hover: none) and (pointer: coarse) {
    &::before {
      min-width: 44px;
      min-height: 44px;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &::before {
      min-width: 24px;
      min-height: 24px;
    }
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
`;

// --- styled elements -------------------------------------------------------

const Card = styled("li", transient)`
  display: flex;
  flex-direction: column;
  /* Each tile is its own query container, so its children adapt to the column
     width they land in — not the viewport. */
  container-type: inline-size;
  container-name: tile;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  transition: box-shadow 0.15s ease;
  @media (hover: hover) {
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const ImageWrap = styled("div", transient)`
  position: relative;
  aspect-ratio: 1;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
`;
const ImagePlaceholder = styled("div", transient)`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
`;
const Badge = styled("span", transient)<{ $high: boolean }>`
  position: absolute;
  top: 6px;
  left: 6px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #f59e0b;
  ${({ $high }) => $high && css`background: #dc2626;`}
`;
const Wishlist = styled("button", transient)<{ $on: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
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
  ${focusRing}
  ${minTargetSize}
  ${({ $on }) => $on && css`color: #ef4444;`}
`;
const Title = styled("h3", transient)`
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
const Rating = styled("div", transient)`
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  overflow: hidden;
`;
const RatingFill = styled("div", transient)<{ $pct: number }>`
  height: 100%;
  background: #fbbf24;
  width: ${({ $pct }) => $pct}%;
`;
const PriceRow = styled("div", transient)`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0 10px;
  /* Roomier price row in wide columns. */
  @container tile (min-width: 240px) {
    gap: 10px;
  }
`;
const OldPrice = styled("span", transient)`
  font-size: 12px;
  color: #9ca3af;
  text-decoration: line-through;
`;
const NowPrice = styled("span", transient)`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
`;
const SrOnly = styled("span", transient)`
  ${srOnly}
`;
const AddToCart = styled("button", transient)<{ $disabled: boolean }>`
  margin-top: auto;
  position: relative;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  cursor: pointer;
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
  ${focusRing}
  ${minTargetSize}
  ${({ $disabled }) =>
    $disabled &&
    css`
      background: #d1d5db;
      color: #6b7280;
      cursor: not-allowed;
    `}
`;

interface Product {
  i: number;
  title: string;
  price: number;
  discount: number;
  rating: number;
  inStock: boolean;
  wishlisted: boolean;
}

const Tile: FunctionComponent<{ p: Product }> = ({ p }) => (
  <Card>
    <ImageWrap>
      <ImagePlaceholder aria-hidden="true" />
      {p.discount > 0 && (
        <Badge $high={p.discount >= 30}>
          <SrOnly>Reduced by </SrOnly>-{p.discount}%
        </Badge>
      )}
      <Wishlist
        $on={p.wishlisted}
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <span aria-hidden="true">♥</span>
      </Wishlist>
    </ImageWrap>
    <Title>{p.title}</Title>
    <Rating role="img" aria-label={`Rated ${p.rating} out of 5`}>
      <RatingFill aria-hidden="true" $pct={(p.rating / 5) * 100} />
    </Rating>
    <PriceRow>
      {p.discount > 0 && (
        <OldPrice>
          <SrOnly>Was </SrOnly>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </OldPrice>
      )}
      <NowPrice>
        {p.discount > 0 && <SrOnly>Now </SrOnly>}${p.price.toFixed(2)}
      </NowPrice>
    </PriceRow>
    <AddToCart
      $disabled={!p.inStock}
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
    >
      {p.inStock ? "Add to cart" : "Sold out"}
    </AddToCart>
  </Card>
);

export default (i: number) => {
  const item: Product = {
    i,
    title: "Product " + i,
    price: (i % 50) + 9.99,
    discount: i % 4 === 0 ? (i % 3 === 0 ? 40 : 20) : 0,
    rating: (i % 5) + 1,
    inStock: i % 7 !== 0,
    wishlisted: i % 6 === 0,
  };
  return <Tile p={item} />;
};
