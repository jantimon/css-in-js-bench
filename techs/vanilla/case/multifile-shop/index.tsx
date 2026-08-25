// bench-strategy: same-as-product-grid-multifile
// vanilla — multifile-shop. The SAME tile as product-grid (same DOM, same CSS), with
// the class names split across modules the way a design system ships them. No library
// and no merge, so the split costs exactly one thing: nothing. This is the floor the
// other lanes' module-boundary costs are measured against.
import React, { type FunctionComponent } from "react";
import { SR_ONLY } from "./tokens";
import { CARD, IMAGE_WRAP, IMAGE_PLACEHOLDER } from "./layout";
import { WISHLIST, WISHLIST_ON, ADD_TO_CART, ADD_TO_CART_DISABLED } from "./controls";
import { BADGE, BADGE_HIGH, TITLE, RATING, RATING_FILL, PRICE_ROW, OLD_PRICE, NOW_PRICE } from "./text";

interface Product {
  i: number;
  title: string;
  price: number;
  discount: number;
  rating: number;
  inStock: boolean;
  wishlisted: boolean;
}

const Tile: FunctionComponent<{ p: Product }> = ({ p }) => {
  const pct = (p.rating / 5) * 100 + "%";
  return (
    <li className={CARD}>
      <div className={IMAGE_WRAP}>
        <div aria-hidden="true" className={IMAGE_PLACEHOLDER} />
        {p.discount > 0 && (
          <span className={p.discount >= 30 ? BADGE_HIGH : BADGE}>
            <span className={SR_ONLY}>Reduced by </span>-{p.discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={p.wishlisted}
          aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={p.wishlisted ? WISHLIST_ON : WISHLIST}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 className={TITLE}>{p.title}</h3>
      <div role="img" aria-label={`Rated ${p.rating} out of 5`} className={RATING}>
        <div aria-hidden="true" className={RATING_FILL} style={{ "--pct": pct } as React.CSSProperties} />
      </div>
      <div className={PRICE_ROW}>
        {p.discount > 0 && (
          <span className={OLD_PRICE}>
            <span className={SR_ONLY}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
          </span>
        )}
        <span className={NOW_PRICE}>
          {p.discount > 0 && <span className={SR_ONLY}>Now </span>}${p.price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!p.inStock}
        aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
        className={p.inStock ? ADD_TO_CART : ADD_TO_CART_DISABLED}
      >
        {p.inStock ? "Add to cart" : "Sold out"}
      </button>
    </li>
  );
};

export default (i: number) => {
  // ONE product built from i with the same per-item formula as the original ITEMS array.
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
