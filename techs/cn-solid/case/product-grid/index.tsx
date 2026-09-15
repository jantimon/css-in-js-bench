// cn-solid — a product-grid TILE as a long Tailwind class list. The elements whose class
// list is fixed use a plain class string (as a user would write it); cn() is only
// called where there's something to resolve — the two always-on buttons and the
// conditional discount badge merge composed token bundles + conditional fragments on
// EVERY render. Default-exports a single-instance render(i) (§6); the harness loops it.
// Class strings + the per-item data formula are verbatim from the React `cn` lane, so
// the pair isolates the framework.
import { cn } from "cn";

// Shared min-target-size + focus-ring token bundles (WCAG 2.5.5 + keyboard nav).
const TAP_TARGET =
  "before:content-[''] before:absolute before:inset-1/2 before:[translate:-50%_-50%] before:w-full before:h-full " +
  "[@media(hover:none)_and_(pointer:coarse)]:before:min-w-[44px] [@media(hover:none)_and_(pointer:coarse)]:before:min-h-[44px] " +
  "[@media(hover:hover)_and_(pointer:fine)]:before:min-w-[24px] [@media(hover:hover)_and_(pointer:fine)]:before:min-h-[24px]";
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2";

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
    <li class="flex flex-col [container-type:inline-size] [container-name:tile] border border-solid border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-150 [@media(hover:hover)]:hover:shadow-md motion-reduce:transition-none">
      <div class="relative aspect-square bg-gray-100 rounded-md overflow-hidden">
        <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
        {props.p().discount > 0 && (
          <span class={cn("absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs leading-[normal] font-bold text-white", props.p().discount >= 30 ? "bg-red-600" : "bg-amber-500")}>
            <span class="sr-only">Reduced by </span>-{props.p().discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={props.p().wishlisted ? "true" : "false"}
          aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          class={cn(
            "absolute top-1.5 right-1.5 border-none rounded-full bg-white/80 cursor-pointer text-lg leading-none p-1 transition-colors duration-150 motion-reduce:transition-none",
            "[@media(hover:hover)]:hover:text-red-500",
            FOCUS_RING,
            TAP_TARGET,
            props.p().wishlisted ? "text-red-500" : "text-gray-400",
          )}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 class="mt-2 mb-1 text-sm leading-[normal] font-medium whitespace-nowrap overflow-hidden text-ellipsis lg:text-[15px] [@container_tile_(min-width:240px)]:text-base [@container_tile_(min-width:240px)]:leading-[normal]">{props.p().title}</h3>
      <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} class="h-2 rounded bg-gray-200 overflow-hidden">
        <div aria-hidden="true" class="h-full bg-amber-400 w-[var(--pct)]" style={{ "--pct": pct() }} />
      </div>
      <div class="flex items-baseline gap-1.5 mt-1.5 mb-2.5 [@container_tile_(min-width:240px)]:gap-2.5">
        {props.p().discount > 0 && (
          <span class="text-xs leading-[normal] text-gray-400 line-through">
            <span class="sr-only">Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
          </span>
        )}
        <span class="text-base leading-[normal] font-bold text-gray-900">
          {props.p().discount > 0 && <span class="sr-only">Now </span>}${props.p().price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!props.p().inStock}
        aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
        class={cn(
          "mt-auto relative border-none rounded-md px-3 py-2 text-sm leading-[normal] font-semibold text-white bg-blue-600 cursor-pointer transition-colors duration-150 motion-reduce:transition-none lg:py-[9px]",
          "[@media(hover:hover)]:hover:bg-blue-700",
          FOCUS_RING,
          TAP_TARGET,
          !props.p().inStock && "bg-gray-300 text-gray-500 cursor-not-allowed",
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
