// bench-strategy: same-as-product-grid-multifile
// cn-solid — multifile-shop. The SAME tile as product-grid (same DOM, same CSS, same
// rendered class lists), laid out the way a design system ships it: shared bundles in
// tokens.ts, a base button in button.ts, and the class lists split by role over layout /
// controls / text. cn concatenates the list on every render; the module split changes
// nothing about that, so this lane should track product-grid.
import { cn } from "cn";
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

// The product arrives as an accessor: a dynamic JSX prop compiles to a getter, so
// `p={p()}` would rebuild the object on every read. aria booleans are written as
// explicit "true"/"false" strings so the markup matches the React lanes.
const Tile = (props: { p: () => Product }) => {
  const pct = () => (props.p().rating / 5) * 100 + "%";
  return (
    <li class={CARD}>
      <div class={IMAGE_WRAP}>
        <div aria-hidden="true" class={IMAGE_PLACEHOLDER} />
        {props.p().discount > 0 && (
          <span class={cn(BADGE, props.p().discount >= 30 ? "bg-red-600" : "bg-amber-500")}>
            <span class="sr-only">Reduced by </span>-{props.p().discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={props.p().wishlisted ? "true" : "false"}
          aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          class={cn(
            BUTTON_BASE,
            WISHLIST,
            WISHLIST_HOVER,
            FOCUS_RING,
            TAP_TARGET,
            props.p().wishlisted ? "text-red-500" : "text-gray-400",
          )}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 class={TITLE}>{props.p().title}</h3>
      <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} class={RATING}>
        <div aria-hidden="true" class={RATING_FILL} style={{ "--pct": pct() }} />
      </div>
      <div class={PRICE_ROW}>
        {props.p().discount > 0 && (
          <span class={OLD_PRICE}>
            <span class="sr-only">Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
          </span>
        )}
        <span class={NOW_PRICE}>
          {props.p().discount > 0 && <span class="sr-only">Now </span>}${props.p().price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!props.p().inStock}
        aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
        class={cn(
          BUTTON_BASE,
          ADD_TO_CART,
          ADD_TO_CART_HOVER,
          FOCUS_RING,
          TAP_TARGET,
          !props.p().inStock && ADD_TO_CART_DISABLED,
        )}
      >
        {props.p().inStock ? "Add to cart" : "Sold out"}
      </button>
    </li>
  );
};

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
