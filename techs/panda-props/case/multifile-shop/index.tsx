// bench-strategy: same-as-product-grid-multifile
// Panda (style props) — multifile-shop. The SAME tile as product-grid (same DOM, same
// CSS, same product data), laid out the way a design system ships it: shared fragments
// in tokens.ts, a base button in button.ts, and the primitives split by role over
// layout / controls / text. Panda resolves style props at render, so file layout costs
// it nothing.
// @ts-nocheck
import React, { type FunctionComponent } from "react";
import { styled } from "styled-system/jsx";
import { buttonBase } from "./button";
import { srOnly, minTargetSize, focusRing } from "./tokens";
import { grid, gridCss, card, cardCss, imageWrap, imagePlaceholder } from "./layout";
import { wishlist, wishlistCss, addToCart, addToCartCss } from "./controls";
import { badge, title, titleCss, rating, ratingFill, priceRow, priceRowCss, oldPrice, nowPrice } from "./text";

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
  <styled.li {...card} css={cardCss}>
    <styled.div {...imageWrap}>
      <styled.div aria-hidden="true" {...imagePlaceholder} />
      {p.discount > 0 && (
        <styled.span {...badge} background={p.discount >= 30 ? "#dc2626" : "#f59e0b"}>
          <styled.span {...srOnly}>Reduced by </styled.span>-{p.discount}%
        </styled.span>
      )}
      <styled.button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...buttonBase}
        {...wishlist}
        css={[wishlistCss, focusRing, minTargetSize]}
        color={p.wishlisted ? "#ef4444" : "#9ca3af"}
      >
        <span aria-hidden="true">♥</span>
      </styled.button>
    </styled.div>
    <styled.h3 {...title} css={titleCss}>{p.title}</styled.h3>
    <styled.div role="img" aria-label={`Rated ${p.rating} out of 5`} {...rating}>
      <styled.div
        aria-hidden="true"
        {...ratingFill}
        style={{ width: (p.rating / 5) * 100 + "%" }}
      />
    </styled.div>
    <styled.div {...priceRow} css={priceRowCss}>
      {p.discount > 0 && (
        <styled.span {...oldPrice}>
          <styled.span {...srOnly}>Was </styled.span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </styled.span>
      )}
      <styled.span {...nowPrice}>
        {p.discount > 0 && <styled.span {...srOnly}>Now </styled.span>}${p.price.toFixed(2)}
      </styled.span>
    </styled.div>
    <styled.button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      {...buttonBase}
      {...addToCart}
      css={[addToCartCss, focusRing, minTargetSize]}
      background={!p.inStock ? "#d1d5db" : "#2563eb"}
      color={!p.inStock ? "#6b7280" : "#fff"}
      cursor={!p.inStock ? "not-allowed" : "pointer"}
    >
      {p.inStock ? "Add to cart" : "Sold out"}
    </styled.button>
  </styled.li>
);

export default (i: number) => {
  const p: Product = {
    i,
    title: "Product " + i,
    price: (i % 50) + 9.99,
    discount: i % 4 === 0 ? (i % 3 === 0 ? 40 : 20) : 0,
    rating: (i % 5) + 1,
    inStock: i % 7 !== 0,
    wishlisted: i % 6 === 0,
  };
  return <Tile p={p} />;
};
