// bench-strategy: same-as-product-grid-multifile
// StyleX on Solid — multifile-shop. The SAME tile as product-grid (same DOM, same CSS, same
// product data), laid out the way a design system ships it: shared bundles in
// tokens.ts, a base button in button.ts, and the primitives split by role over
// layout / controls / text. StyleX folds the merge to a literal class only
// when the create() it reads sits in the SAME module, so every join below stays at
// runtime. attrs() rather than props(): { class, style-string } is what a non-React
// renderer wants.
// @ts-nocheck
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

const Tile = (props: { p: () => Product }) => (
  <li {...stylex.attrs(layoutStyles.card)}>
    <div {...stylex.attrs(layoutStyles.imageWrap)}>
      <div aria-hidden="true" {...stylex.attrs(layoutStyles.imagePlaceholder)} />
      {props.p().discount > 0 && (
        <span {...stylex.attrs(textStyles.badge, props.p().discount >= 30 && textStyles.badgeHigh)}>
          <span {...stylex.attrs(shared.srOnly)}>Reduced by </span>-{props.p().discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={props.p().wishlisted ? "true" : "false"}
        aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...stylex.attrs(buttonBase.base, controlsStyles.wishlist, shared.focusRing, shared.minTarget, props.p().wishlisted && controlsStyles.wishlistOn)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 {...stylex.attrs(textStyles.title)}>{props.p().title}</h3>
    <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} {...stylex.attrs(textStyles.rating)}>
      <div aria-hidden="true" {...stylex.attrs(textStyles.ratingFill, textStyles.fillW((props.p().rating / 5) * 100))} />
    </div>
    <div {...stylex.attrs(textStyles.priceRow)}>
      {props.p().discount > 0 && (
        <span {...stylex.attrs(textStyles.oldPrice)}>
          <span {...stylex.attrs(shared.srOnly)}>Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
        </span>
      )}
      <span {...stylex.attrs(textStyles.nowPrice)}>
        {props.p().discount > 0 && <span {...stylex.attrs(shared.srOnly)}>Now </span>}${props.p().price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!props.p().inStock}
      aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
      {...stylex.attrs(buttonBase.base, controlsStyles.addToCart, shared.focusRing, shared.minTarget, !props.p().inStock && controlsStyles.addToCartDisabled)}
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
