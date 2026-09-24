// bench-strategy: same-as-product-grid-multifile
// The product-grid workload is split into design-system modules. Plumeria resolves the
// cross-module compositions to literal class names just as it does in one file.
import type { JSX } from "@solidjs/web";
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

const Tile = (props: { p: () => Product }) => (
  <li classStyle={layoutStyles.card}>
    <div classStyle={layoutStyles.imageWrap}>
      <div aria-hidden="true" classStyle={layoutStyles.imagePlaceholder} />
      {props.p().discount > 0 && (
        <span classStyle={[textStyles.badge, props.p().discount >= 30 && textStyles.badgeHigh]}>
          <span classStyle={shared.srOnly}>Reduced by </span>-{props.p().discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={props.p().wishlisted ? "true" : "false"}
        aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        classStyle={[buttonBase.base, controlsStyles.wishlist, shared.focusRing, shared.minTarget, props.p().wishlisted && controlsStyles.wishlistOn]}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 classStyle={textStyles.title}>{props.p().title}</h3>
    <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} classStyle={textStyles.rating}>
      <div aria-hidden="true" classStyle={[textStyles.ratingFill, textStyles.fillW((props.p().rating / 5) * 100)]} />
    </div>
    <div classStyle={textStyles.priceRow}>
      {props.p().discount > 0 && (
        <span classStyle={textStyles.oldPrice}>
          <span classStyle={shared.srOnly}>Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
        </span>
      )}
      <span classStyle={textStyles.nowPrice}>
        {props.p().discount > 0 && <span classStyle={shared.srOnly}>Now </span>}${props.p().price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!props.p().inStock}
      aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
      classStyle={[buttonBase.base, controlsStyles.addToCart, shared.focusRing, shared.minTarget, !props.p().inStock && controlsStyles.addToCartDisabled]}
    >
      {props.p().inStock ? "Add to cart" : "Sold out"}
    </button>
  </li>
);

export default (i: () => number) => {
  // ONE product built from i with the same per-item formula as every other lane.
  // Cached on the index: the accessor is read many times per render and the formula is
  // the same every time, so rebuilding the object per read would be pure waste.
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
