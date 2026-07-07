// tailwind-merge — a product-grid TILE as a long Tailwind class list. The elements
// whose class list is fixed use a plain className string (as a user would write it);
// cn() is only called where there's something to resolve — the two always-on buttons
// and the conditional discount badge run twMerge(clsx()) over composed token bundles +
// conditional fragments on EVERY render (next-yak did all of this at build time).
// Default-exports a single-instance render(i) (§6); the harness loops it. Class
// strings + the per-item data formula are verbatim from the original twmerge product-grid lane.
import React, { type FunctionComponent } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));

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

const Tile: FunctionComponent<{ p: Product }> = ({ p }) => {
  const pct = (p.rating / 5) * 100 + "%";
  return (
    <li className="flex flex-col [container-type:inline-size] [container-name:tile] border border-solid border-gray-200 rounded-lg p-3 bg-white transition-shadow duration-150 [@media(hover:hover)]:hover:shadow-md motion-reduce:transition-none">
      <div className="relative aspect-square bg-gray-100 rounded-md overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
        {p.discount > 0 && (
          <span className={cn("absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs leading-[normal] font-bold text-white", p.discount >= 30 ? "bg-red-600" : "bg-amber-500")}>
            <span className="sr-only">Reduced by </span>-{p.discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={p.wishlisted}
          aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "absolute top-1.5 right-1.5 border-none rounded-full bg-white/80 cursor-pointer text-lg leading-none p-1 transition-colors duration-150 motion-reduce:transition-none",
            "[@media(hover:hover)]:hover:text-red-500",
            FOCUS_RING,
            TAP_TARGET,
            p.wishlisted ? "text-red-500" : "text-gray-400",
          )}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 className="mt-2 mb-1 text-sm leading-[normal] font-medium whitespace-nowrap overflow-hidden text-ellipsis lg:text-[15px] [@container_tile_(min-width:240px)]:text-base [@container_tile_(min-width:240px)]:leading-[normal]">{p.title}</h3>
      <div role="img" aria-label={`Rated ${p.rating} out of 5`} className="h-2 rounded bg-gray-200 overflow-hidden">
        <div aria-hidden="true" className="h-full bg-amber-400 w-[var(--pct)]" style={{ "--pct": pct } as React.CSSProperties} />
      </div>
      <div className="flex items-baseline gap-1.5 mt-1.5 mb-2.5 [@container_tile_(min-width:240px)]:gap-2.5">
        {p.discount > 0 && (
          <span className="text-xs leading-[normal] text-gray-400 line-through">
            <span className="sr-only">Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
          </span>
        )}
        <span className="text-base leading-[normal] font-bold text-gray-900">
          {p.discount > 0 && <span className="sr-only">Now </span>}${p.price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!p.inStock}
        aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
        className={cn(
          "mt-auto relative border-none rounded-md px-3 py-2 text-sm leading-[normal] font-semibold text-white bg-blue-600 cursor-pointer transition-colors duration-150 motion-reduce:transition-none lg:py-[9px]",
          "[@media(hover:hover)]:hover:bg-blue-700",
          FOCUS_RING,
          TAP_TARGET,
          !p.inStock && "bg-gray-300 text-gray-500 cursor-not-allowed",
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
