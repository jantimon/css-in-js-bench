// vanilla-solid lane — hand-written ceiling for a product-grid TILE. Literal class names
// over author-written CSS (./styles.css), the rating width via an inline style variable,
// the same enriched DOM (responsive grid item, focus-visible, WCAG tap targets,
// container query, a11y semantics) — but no library and no merge, so class computation
// is just a ternary. The per-item data formula matches every other lane.
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
    <li class="pcard">
      <div class="pimg">
        <div aria-hidden="true" class="pimg-ph" />
        {props.p().discount > 0 && (
          <span class={props.p().discount >= 30 ? "pbadge pbadge-high" : "pbadge"}>
            <span class="sr-only">Reduced by </span>-{props.p().discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={props.p().wishlisted ? "true" : "false"}
          aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          class={props.p().wishlisted ? "pwish pwish-on" : "pwish"}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 class="ptitle">{props.p().title}</h3>
      <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} class="prating">
        <div aria-hidden="true" class="prating-fill" style={{ "--pct": pct() }} />
      </div>
      <div class="pprice">
        {props.p().discount > 0 && (
          <span class="pprice-old">
            <span class="sr-only">Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
          </span>
        )}
        <span class="pprice-now">
          {props.p().discount > 0 && <span class="sr-only">Now </span>}${props.p().price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!props.p().inStock}
        aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
        class={props.p().inStock ? "pcart" : "pcart pcart-disabled"}
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
