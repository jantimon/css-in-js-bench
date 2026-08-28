// bench-strategy: same-as-product-grid-multifile
// Bamboo — multifile-shop. The SAME tile as product-grid (same DOM, same CSS, same
// product data), laid out the way a design system ships it: shared fragments in
// tokens.ts, a base button in button.ts, and the primitives split by role over
// layout / controls / text. Bamboo folds css() to a class literal per module, but its cx() merge only
// resolves arguments declared in the SAME file, so the joins below stay at runtime.
// @ts-nocheck
import React, { type FunctionComponent } from "react";
import { cx } from "styled-system/css";
import { buttonBase } from "./button";
import { srOnly, minTargetSize, focusRing } from "./tokens";
import { grid, card, imageWrap, imagePlaceholder } from "./layout";
import { wishlist, wishlistOn, addToCart, addToCartDisabled } from "./controls";
import { badge, badgeHigh, title, rating, ratingFill, priceRow, oldPrice, nowPrice } from "./text";

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
        <span className={cx(badge, p.discount >= 30 && badgeHigh)}>
          <span className={srOnly}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={cx(buttonBase, wishlist, focusRing, minTargetSize, p.wishlisted && wishlistOn)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 className={title}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} className={rating}>
      <div
        aria-hidden="true"
        className={ratingFill}
        style={{ width: (p.rating / 5) * 100 + "%" }}
      />
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
      className={cx(buttonBase, addToCart, focusRing, minTargetSize, !p.inStock && addToCartDisabled)}
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
