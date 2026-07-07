// vanilla lane — hand-written ceiling for a product-grid TILE. Literal class names
// over author-written CSS (./styles.css), the rating width via an inline style
// variable, the same enriched DOM (responsive grid item, focus-visible, WCAG tap
// targets, container query, a11y semantics) — but no library and no merge, so
// className computation is just a ternary. Default-exports a single-instance
// render(i) (§6); the harness loops it. The per-item data formula is verbatim from
// the original vanilla product-grid lane.
import React, { type FunctionComponent } from "react";

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
    <li className="pcard">
      <div className="pimg">
        <div aria-hidden="true" className="pimg-ph" />
        {p.discount > 0 && (
          <span className={p.discount >= 30 ? "pbadge pbadge-high" : "pbadge"}>
            <span className="sr-only">Reduced by </span>-{p.discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={p.wishlisted}
          aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={p.wishlisted ? "pwish pwish-on" : "pwish"}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 className="ptitle">{p.title}</h3>
      <div role="img" aria-label={`Rated ${p.rating} out of 5`} className="prating">
        <div aria-hidden="true" className="prating-fill" style={{ "--pct": pct } as React.CSSProperties} />
      </div>
      <div className="pprice">
        {p.discount > 0 && (
          <span className="pprice-old">
            <span className="sr-only">Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
          </span>
        )}
        <span className="pprice-now">
          {p.discount > 0 && <span className="sr-only">Now </span>}${p.price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!p.inStock}
        aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
        className={p.inStock ? "pcart" : "pcart pcart-disabled"}
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
