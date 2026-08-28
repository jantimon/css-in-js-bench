// bench-strategy: same-as-product-grid-multifile
// tailwind-merge — multifile-shop. The SAME tile as product-grid (same DOM, same CSS,
// same rendered class lists), laid out the way a design system ships it: shared bundles
// in tokens.ts, a base button in button.ts, and the class lists split by role over
// layout / controls / text. twMerge re-parses and conflict-resolves the whole list on every render; the
// module split changes nothing about that, so this lane should track product-grid.
import React, { type FunctionComponent } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));
import { BUTTON_BASE } from "./button";
import { FOCUS_RING, TAP_TARGET } from "./tokens";
import { CARD, IMAGE_WRAP, IMAGE_PLACEHOLDER } from "./layout";
import { WISHLIST, WISHLIST_HOVER, ADD_TO_CART, ADD_TO_CART_HOVER, ADD_TO_CART_DISABLED } from "./controls";
import { BADGE, TITLE, RATING, RATING_FILL, PRICE_ROW, OLD_PRICE, NOW_PRICE } from "./text";

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
          <span className={cn(BADGE, p.discount >= 30 ? "bg-red-600" : "bg-amber-500")}>
            <span className="sr-only">Reduced by </span>-{p.discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={p.wishlisted}
          aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            BUTTON_BASE,
            WISHLIST,
            WISHLIST_HOVER,
            FOCUS_RING,
            TAP_TARGET,
            p.wishlisted ? "text-red-500" : "text-gray-400",
          )}
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
            <span className="sr-only">Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
          </span>
        )}
        <span className={NOW_PRICE}>
          {p.discount > 0 && <span className="sr-only">Now </span>}${p.price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!p.inStock}
        aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
        className={cn(
          BUTTON_BASE,
          ADD_TO_CART,
          ADD_TO_CART_HOVER,
          FOCUS_RING,
          TAP_TARGET,
          !p.inStock && ADD_TO_CART_DISABLED,
        )}
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
