// bench-strategy: same-as-product-grid-multifile
// The product-grid workload is split into design-system modules. Plumeria resolves the
// cross-module compositions to literal class names just as it does in one file.
import React, { type FunctionComponent } from "react";
import "@plumeria/core";
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
  <li classStyle={layoutStyles.card}>
    <div classStyle={layoutStyles.imageWrap}>
      <div aria-hidden="true" classStyle={layoutStyles.imagePlaceholder} />
      {p.discount > 0 && (
        <span classStyle={[textStyles.badge, p.discount >= 30 && textStyles.badgeHigh]}>
          <span classStyle={shared.srOnly}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        classStyle={[buttonBase.base, controlsStyles.wishlist, shared.focusRing, shared.minTarget, p.wishlisted && controlsStyles.wishlistOn]}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 classStyle={textStyles.title}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} classStyle={textStyles.rating}>
      <div aria-hidden="true" classStyle={[textStyles.ratingFill, textStyles.fillW((p.rating / 5) * 100)]} />
    </div>
    <div classStyle={textStyles.priceRow}>
      {p.discount > 0 && (
        <span classStyle={textStyles.oldPrice}>
          <span classStyle={shared.srOnly}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span classStyle={textStyles.nowPrice}>
        {p.discount > 0 && <span classStyle={shared.srOnly}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      classStyle={[buttonBase.base, controlsStyles.addToCart, shared.focusRing, shared.minTarget, !p.inStock && controlsStyles.addToCartDisabled]}
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
