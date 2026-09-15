// bench-strategy: same-as-product-grid-multifile
// vanilla-solid — multifile-shop. The SAME tile as product-grid (same DOM, same CSS),
// with the class names split across modules the way a design system ships them. No
// library and no merge — but the split is not free the way it is on React: a string
// literal folds into the compiled template and an imported constant cannot, so every
// class name here becomes a runtime binding.
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

const Tile = (props: { p: () => Product }) => {
  const pct = () => (props.p().rating / 5) * 100 + "%";
  return (
    <li class={CARD}>
      <div class={IMAGE_WRAP}>
        <div aria-hidden="true" class={IMAGE_PLACEHOLDER} />
        {props.p().discount > 0 && (
          <span class={props.p().discount >= 30 ? BADGE_HIGH : BADGE}>
            <span class={SR_ONLY}>Reduced by </span>-{props.p().discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={props.p().wishlisted ? "true" : "false"}
          aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          class={props.p().wishlisted ? WISHLIST_ON : WISHLIST}
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
            <span class={SR_ONLY}>Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
          </span>
        )}
        <span class={NOW_PRICE}>
          {props.p().discount > 0 && <span class={SR_ONLY}>Now </span>}${props.p().price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!props.p().inStock}
        aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
        class={props.p().inStock ? ADD_TO_CART : ADD_TO_CART_DISABLED}
      >
        {props.p().inStock ? "Add to cart" : "Sold out"}
      </button>
    </li>
  );
};

export default (i: () => number) => {
  // ONE product built from i with the same per-item formula as every other lane.
  // Cached on the index: `Tile` reads the product many times per render and a dynamic JSX
  // prop compiles to a getter, so the accessor is forwarded as a plain prop and the object
  // is built once per distinct index instead of once per read.
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
