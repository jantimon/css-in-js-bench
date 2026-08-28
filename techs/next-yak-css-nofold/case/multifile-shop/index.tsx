// bench-strategy: same-as-product-grid-multifile
// next-yak (css prop) — multifile-shop. The SAME tile as product-grid (same DOM, same
// CSS, same product data), laid out the way a design system ships it: shared fragments
// in tokens.ts, a base button in button.ts, and the primitives split by role over
// layout / controls / text. The css prop folds on the element where it is WRITTEN and
// resolves interpolated fragments at build time, so an imported fragment costs nothing
// — but a $-prop closure reads component scope, so the three dynamic halves cannot
// leave this file. That asymmetry is the point of the cell.
/** @jsxImportSource next-yak */
import React, { type FunctionComponent } from "react";
import { css } from "next-yak";
import { srOnly } from "./tokens";
import { button } from "./button";
import { card, imageWrap, imagePlaceholder } from "./layout";
import { wishlist, addToCart } from "./controls";
import { badge, title, rating, ratingFill, priceRow, oldPrice, nowPrice } from "./text";

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
  // Dynamic flags, captured by the css-prop closures below (the css prop runs
  // them against {}, so they read these from the component scope, not props).
  const high = p.discount >= 30;
  const on = p.wishlisted;
  const disabled = !p.inStock;
  const pct = (p.rating / 5) * 100;
  return (
    <li css={css`${card}`}>
      <div css={css`${imageWrap}`}>
        <div aria-hidden="true" css={css`${imagePlaceholder}`} />
        {p.discount > 0 && (
          <span
            css={css`
              ${badge};
              ${() => high && css`background: #dc2626;`}
            `}
          >
            <span css={css`${srOnly}`}>Reduced by </span>-{p.discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={p.wishlisted}
          aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          css={css`
            ${button};
            ${wishlist};
            ${() => on && css`color: #ef4444;`}
          `}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 css={css`${title}`}>{p.title}</h3>
      <div role="img" aria-label={`Rated ${p.rating} out of 5`} css={css`${rating}`}>
        <div
          aria-hidden="true"
          style={{ "--pct": pct + "%" } as React.CSSProperties}
          css={css`${ratingFill}`}
        />
      </div>
      <div css={css`${priceRow}`}>
        {p.discount > 0 && (
          <span css={css`${oldPrice}`}>
            <span css={css`${srOnly}`}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
          </span>
        )}
        <span css={css`${nowPrice}`}>
          {p.discount > 0 && <span css={css`${srOnly}`}>Now </span>}${p.price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!p.inStock}
        aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
        css={css`
          ${button};
          ${addToCart};
          ${() =>
            disabled &&
            css`
              background: #d1d5db;
              color: #6b7280;
              cursor: not-allowed;
            `}
        `}
      >
        {p.inStock ? "Add to cart" : "Sold out"}
      </button>
    </li>
  );
};

export default (i: number) => {
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
