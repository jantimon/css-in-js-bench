// bench-strategy: same-as-product-grid-multifile
// Coulis — multifile-shop. The SAME tile as product-grid (same DOM, same CSS, same
// product data), laid out the way a design system ships it: shared bundles in
// tokens.ts, a base button in button.ts, and the primitives split by role over
// layout / controls / text. Modules export class names created once at evaluation.
// @ts-nocheck
import React, { type FunctionComponent } from "react";
import { createStyles } from "../../coulis";
import { srOnly } from "./tokens";
import { card, imagePlaceholder, imageWrap } from "./layout";
import { addToCart, addToCartDisabled, wishlist, wishlistOn } from "./controls";
import { badge, badgeHigh, nowPrice, oldPrice, priceRow, rating, ratingFill, title } from "./text";

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
  <li className={card}>
    <div className={imageWrap}>
      <div aria-hidden="true" className={imagePlaceholder} />
      {p.discount > 0 && (
        <span className={p.discount >= 30 ? badgeHigh : badge}>
          <span className={srOnly}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={p.wishlisted ? wishlistOn : wishlist}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 className={title}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} className={rating}>
      <div aria-hidden="true" className={`${ratingFill} ${createStyles({ width: `${(p.rating / 5) * 100}%` })}`} />
    </div>
    <div className={priceRow}>
      {p.discount > 0 && (
        <span className={oldPrice}>
          <span className={srOnly}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span className={nowPrice}>
        {p.discount > 0 && <span className={srOnly}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      className={p.inStock ? addToCart : addToCartDisabled}
    >
      {p.inStock ? "Add to cart" : "Sold out"}
    </button>
  </li>
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
