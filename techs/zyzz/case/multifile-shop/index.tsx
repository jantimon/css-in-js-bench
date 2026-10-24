// bench-strategy: same-as-product-grid-multifile
// Zyzz — multifile-shop. The SAME tile as product-grid (same DOM, same CSS), with the
// styles split across modules the way a design system ships them: shared fragments in
// tokens.ts, the definitions by role across layout.ts / controls.ts / text.ts, and every
// use site here. Each definition compiles in its own module, and this module applies them.
import React, { type FunctionComponent } from "react";
import { cx } from "zyzz";
import * as controls from "./controls";
import * as layout from "./layout";
import * as text from "./text";
import * as tokens from "./tokens";

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
  <li {...layout.card()}>
    <div {...layout.image()}>
      <div aria-hidden="true" {...layout.placeholder()} />
      {p.discount > 0 && (
        <span {...cx(text.badge(), p.discount >= 30 && text.badgeHigh())}>
          <span {...tokens.srOnly()}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...cx(controls.wish(), p.wishlisted && controls.wishOn())}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 {...text.title()}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} {...text.rating()}>
      <div aria-hidden="true" {...text.ratingFill({ width: `${(p.rating / 5) * 100}%` })} />
    </div>
    <div {...text.price()}>
      {p.discount > 0 && (
        <span {...text.priceOld()}>
          <span {...tokens.srOnly()}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span {...text.priceNow()}>
        {p.discount > 0 && <span {...tokens.srOnly()}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      {...cx(controls.cart(), !p.inStock && controls.cartDisabled())}
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
