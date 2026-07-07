// @ts-nocheck
import React, { type FunctionComponent } from "react";
import { css, cx } from "styled-system/css";

// Panda CSS port of the product grid: 400 product tiles, each composed of ~11
// elements that mix static styles, conditional variants (sale badge, wishlist,
// stock), a dynamic value (the rating bar width) AND the things real production
// tiles ship: a responsive grid, hover guarded behind (hover: hover),
// :focus-visible rings, WCAG min-target-size ::before pseudo-elements on the tap
// targets, reduced-motion handling, a container query per tile, and a11y
// semantics. Panda's css() returns atomic class names at runtime (the cost we
// measure); the rules are extracted at build time by `panda cssgen` scanning
// these static objects — so the one dynamic value (rating bar width) is applied
// via an inline style, exactly like the vanilla/idiomatic lanes.

// --- shared layers ---------------------------------------------------------


/** Visually-hidden, still read by screen readers. */
const srOnly = css({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
});

/** WCAG 2.5.5 minimum target size — grows the hit area without changing layout. */
const minTargetSize = css({
  _before: {
    content: '""',
    position: "absolute",
    inset: "50%",
    translate: "-50% -50%",
    width: "100%",
    height: "100%",
  },
  "@media (hover: none) and (pointer: coarse)": {
    _before: {
      minWidth: "44px",
      minHeight: "44px",
    },
  },
  "@media (hover: hover) and (pointer: fine)": {
    _before: {
      minWidth: "24px",
      minHeight: "24px",
    },
  },
});

const focusRing = css({
  _focusVisible: {
    outline: "2px solid #2563eb",
    outlineOffset: "2px",
  },
});

// --- element class bundles -------------------------------------------------

const grid = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  margin: "0",
  padding: "0",
  listStyle: "none",
  "@media (min-width: 640px)": {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  "@media (min-width: 992px)": {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },
});

const card = css({
  display: "flex",
  flexDirection: "column",
  // Each tile is its own query container, so its children adapt to the column
  // width they land in — not the viewport.
  containerType: "inline-size",
  containerName: "tile",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
  transition: "box-shadow 0.15s ease",
  "@media (hover: hover)": {
    _hover: {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

const imageWrap = css({
  position: "relative",
  aspectRatio: "1",
  background: "#f3f4f6",
  borderRadius: "6px",
  overflow: "hidden",
});

const imagePlaceholder = css({
  position: "absolute",
  inset: "0",
  background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
});

const badge = css({
  position: "absolute",
  top: "6px",
  left: "6px",
  borderRadius: "4px",
  padding: "2px 6px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#fff",
  background: "#f59e0b",
});
const badgeHigh = css({ background: "#dc2626" });

const wishlist = css({
  position: "absolute",
  top: "6px",
  right: "6px",
  border: "none",
  borderRadius: "9999px",
  background: "rgba(255, 255, 255, 0.8)",
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: "1",
  padding: "4px",
  color: "#9ca3af",
  transition: "color 0.15s ease",
  "@media (hover: hover)": {
    _hover: {
      color: "#ef4444",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});
const wishlistOn = css({ color: "#ef4444" });

const title = css({
  margin: "8px 0 4px",
  fontSize: "14px",
  fontWeight: "500",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  "@media (min-width: 992px)": {
    fontSize: "15px",
  },
  // Wider columns get a slightly larger title.
  "@container tile (min-width: 240px)": {
    fontSize: "16px",
  },
});

const rating = css({
  height: "8px",
  borderRadius: "4px",
  background: "#e5e7eb",
  overflow: "hidden",
});

// NOTE: the rating bar fill width is the one dynamic, per-card value (the yak
// template threads it through a CSS variable / inline width). Panda's css()
// must stay static for build-time extraction, so we keep every static rule here
// and apply the width via an inline `style` below — same final width, so the
// computed-style parity gate holds.
const ratingFill = css({
  height: "100%",
  background: "#fbbf24",
});

const priceRow = css({
  display: "flex",
  alignItems: "baseline",
  gap: "6px",
  margin: "6px 0 10px",
  // Roomier price row in wide columns.
  "@container tile (min-width: 240px)": {
    gap: "10px",
  },
});

const oldPrice = css({
  fontSize: "12px",
  color: "#9ca3af",
  textDecoration: "line-through",
});

const nowPrice = css({
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
});

const addToCart = css({
  marginTop: "auto",
  position: "relative",
  border: "none",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#fff",
  background: "#2563eb",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  "@media (hover: hover)": {
    "&:hover:not(:disabled)": {
      background: "#1d4ed8",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
  "@media (min-width: 992px)": {
    padding: "9px 12px",
  },
});
const addToCartDisabled = css({
  background: "#d1d5db",
  color: "#6b7280",
  cursor: "not-allowed",
});

interface Product {
  i: number;
  title: string;
  price: number;
  discount: number;
  rating: number;
  inStock: boolean;
  wishlisted: boolean;
}

const Tile: FunctionComponent<{ p: Product }> = ({ p }) => (
  <li className={card}>
    <div className={imageWrap}>
      <div aria-hidden="true" className={imagePlaceholder} />
      {p.discount > 0 && (
        <span className={cx(badge, p.discount >= 30 && badgeHigh)}>
          <span className={srOnly}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={cx(wishlist, focusRing, minTargetSize, p.wishlisted && wishlistOn)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 className={title}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} className={rating}>
      <div
        aria-hidden="true"
        className={ratingFill}
        style={{ width: (p.rating / 5) * 100 + "%" }}
      />
    </div>
    <div className={priceRow}>
      {p.discount > 0 && (
        <span className={oldPrice}>
          <span className={srOnly}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span className={nowPrice}>
        {p.discount > 0 && <span className={srOnly}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      className={cx(addToCart, focusRing, minTargetSize, !p.inStock && addToCartDisabled)}
    >
      {p.inStock ? "Add to cart" : "Sold out"}
    </button>
  </li>
);

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
