// bench-strategy: same-as-product-grid-multifile
// Bamboo Solid — multifile-shop. The SAME tile as product-grid (same DOM, same CSS, same
// product data), laid out the way a design system ships it: the Bamboo React lane's style
// modules unchanged (shared fragments in tokens.ts, a base button in button.ts, the
// primitives split by role over layout / controls / text) over the vanilla-solid lane's
// tile. An imported class is a binding here, as in the vanilla-solid lane; a cx() over
// imported classes is read across the module boundary and compiled to its literal.
// @ts-nocheck
import { cx } from "styled-system/css";
import { buttonBase } from "./button";
import { srOnly, minTargetSize, focusRing } from "./tokens";
import { card, imageWrap, imagePlaceholder } from "./layout";
import { wishlist, wishlistOn, addToCart } from "./controls";
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

const Tile = (props: { p: () => Product }) => {
  const pct = () => (props.p().rating / 5) * 100 + "%";
  return (
    <li class={card}>
      <div class={imageWrap}>
        <div aria-hidden="true" class={imagePlaceholder} />
        {props.p().discount > 0 && (
          <span class={cx(badge, props.p().discount >= 30 && badgeHigh)}>
            <span class={srOnly}>Reduced by </span>-{props.p().discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={props.p().wishlisted ? "true" : "false"}
          aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          class={cx(buttonBase, wishlist, focusRing, minTargetSize, props.p().wishlisted && wishlistOn)}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 class={title}>{props.p().title}</h3>
      <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} class={rating}>
        <div aria-hidden="true" class={ratingFill} style={{ width: pct() }} />
      </div>
      <div class={priceRow}>
        {props.p().discount > 0 && (
          <span class={oldPrice}>
            <span class={srOnly}>Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
          </span>
        )}
        <span class={nowPrice}>
          {props.p().discount > 0 && <span class={srOnly}>Now </span>}${props.p().price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!props.p().inStock}
        aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
        class={cx(buttonBase, addToCart, focusRing, minTargetSize)}
      >
        {props.p().inStock ? "Add to cart" : "Sold out"}
      </button>
    </li>
  );
};

export default (i: () => number) => {
  // ONE product built from i with the same per-item formula as every other lane, cached on
  // the index as in the vanilla-solid lane: `Tile` reads the product many times per render.
  let last = NaN;
  let cached!: Product;
  const p = (): Product => {
    const n = i();
    if (n !== last) {
      last = n;
      cached = {
        i: n,
        title: "Product " + n,
        price: (n % 50) + 9.99,
        discount: n % 4 === 0 ? (n % 3 === 0 ? 40 : 20) : 0,
        rating: (n % 5) + 1,
        inStock: n % 7 !== 0,
        wishlisted: n % 6 === 0,
      };
    }
    return cached;
  };
  return <Tile p={p} />;
};
