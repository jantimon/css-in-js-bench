// bench-strategy: same-as-product-grid-multifile
// StyleX — multifile-shop. The SAME tile as product-grid (same DOM, same CSS, same
// product data), laid out the way a design system ships it: shared bundles in
// tokens.ts, a base button in button.ts, and the primitives split by role over
// layout / controls / text. StyleX folds stylex.props() to a literal className only
// when the create() it reads sits in the SAME module, so every join below stays at
// runtime.
// @ts-nocheck
import React, { type FunctionComponent } from "react";
import * as stylex from "@stylexjs/stylex";
import { buttonBase } from "./button";
import { shared } from "./tokens";
import { layoutStyles } from "./layout";
import { controlsStyles } from "./controls";
import { textStyles } from "./text";

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
  <li {...stylex.props(layoutStyles.card)}>
    <div {...stylex.props(layoutStyles.imageWrap)}>
      <div aria-hidden="true" {...stylex.props(layoutStyles.imagePlaceholder)} />
      {p.discount > 0 && (
        <span {...stylex.props(textStyles.badge, p.discount >= 30 && textStyles.badgeHigh)}>
          <span {...stylex.props(shared.srOnly)}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...stylex.props(buttonBase.base, controlsStyles.wishlist, shared.focusRing, shared.minTarget, p.wishlisted && controlsStyles.wishlistOn)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 {...stylex.props(textStyles.title)}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} {...stylex.props(textStyles.rating)}>
      <div aria-hidden="true" {...stylex.props(textStyles.ratingFill, textStyles.fillW((p.rating / 5) * 100))} />
    </div>
    <div {...stylex.props(textStyles.priceRow)}>
      {p.discount > 0 && (
        <span {...stylex.props(textStyles.oldPrice)}>
          <span {...stylex.props(shared.srOnly)}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span {...stylex.props(textStyles.nowPrice)}>
        {p.discount > 0 && <span {...stylex.props(shared.srOnly)}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      {...stylex.props(buttonBase.base, controlsStyles.addToCart, shared.focusRing, shared.minTarget, !p.inStock && controlsStyles.addToCartDisabled)}
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
