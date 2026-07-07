/** @jsxImportSource next-yak */
import React, { type FunctionComponent } from "react";
import { css } from "next-yak";

// The SAME product tile as product-grid.yak.tsx, but authored with next-yak's
// css PROP instead of styled() components: every element is a plain host tag
// carrying `css={css`…`}`, so there is NO styled-component wrapper at all (the
// css prop renders straight onto the host element). Build-time CSS extraction is
// identical to the styled lane — same declarations, same media/pseudo/container
// queries — only the authoring shape and the runtime component tree differ.
// Dynamic variants use the css-prop closure form (`${() => cond && css`…`}`,
// which the SWC plugin resolves per render); the continuous rating width rides a
// CSS variable set via `style`, the idiomatic css-prop dynamic pattern.

const desktop = "@media (min-width: 992px)";

/** Visually-hidden, still read by screen readers. */
const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/** WCAG 2.5.5 minimum target size — grows the hit area without changing layout. */
const minTargetSize = css`
  &::before {
    content: "";
    position: absolute;
    inset: 50%;
    translate: -50% -50%;
    width: 100%;
    height: 100%;
  }
  @media (hover: none) and (pointer: coarse) {
    &::before {
      min-width: 44px;
      min-height: 44px;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &::before {
      min-width: 24px;
      min-height: 24px;
    }
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
`;

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
    <li
      css={css`
        display: flex;
        flex-direction: column;
        container-type: inline-size;
        container-name: tile;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
        background: #fff;
        transition: box-shadow 0.15s ease;
        @media (hover: hover) {
          &:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          transition: none;
        }
      `}
    >
      <div
        css={css`
          position: relative;
          aspect-ratio: 1;
          background: #f3f4f6;
          border-radius: 6px;
          overflow: hidden;
        `}
      >
        <div
          aria-hidden="true"
          css={css`
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          `}
        />
        {p.discount > 0 && (
          <span
            css={css`
              position: absolute;
              top: 6px;
              left: 6px;
              border-radius: 4px;
              padding: 2px 6px;
              font-size: 12px;
              font-weight: 700;
              color: #fff;
              background: #f59e0b;
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
            position: absolute;
            top: 6px;
            right: 6px;
            border: none;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 4px;
            color: #9ca3af;
            transition: color 0.15s ease;
            @media (hover: hover) {
              &:hover {
                color: #ef4444;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              transition: none;
            }
            ${focusRing}
            ${minTargetSize}
            ${() => on && css`color: #ef4444;`}
          `}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3
        css={css`
          margin: 8px 0 4px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          ${desktop} {
            font-size: 15px;
          }
          @container tile (min-width: 240px) {
            font-size: 16px;
          }
        `}
      >
        {p.title}
      </h3>
      <div
        role="img"
        aria-label={`Rated ${p.rating} out of 5`}
        css={css`
          height: 8px;
          border-radius: 4px;
          background: #e5e7eb;
          overflow: hidden;
        `}
      >
        <div
          aria-hidden="true"
          style={{ "--pct": pct + "%" } as React.CSSProperties}
          css={css`
            height: 100%;
            background: #fbbf24;
            width: var(--pct);
          `}
        />
      </div>
      <div
        css={css`
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin: 6px 0 10px;
          @container tile (min-width: 240px) {
            gap: 10px;
          }
        `}
      >
        {p.discount > 0 && (
          <span
            css={css`
              font-size: 12px;
              color: #9ca3af;
              text-decoration: line-through;
            `}
          >
            <span css={css`${srOnly}`}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
          </span>
        )}
        <span
          css={css`
            font-size: 16px;
            font-weight: 700;
            color: #111827;
          `}
        >
          {p.discount > 0 && <span css={css`${srOnly}`}>Now </span>}${p.price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!p.inStock}
        aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
        css={css`
          margin-top: auto;
          position: relative;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: #2563eb;
          cursor: pointer;
          transition: background-color 0.15s ease;
          @media (hover: hover) {
            &:hover:not(:disabled) {
              background: #1d4ed8;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            transition: none;
          }
          ${desktop} {
            padding: 9px 12px;
          }
          ${focusRing}
          ${minTargetSize}
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
