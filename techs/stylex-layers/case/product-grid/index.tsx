// @ts-nocheck
import React, { type FunctionComponent } from "react";
import * as stylex from "@stylexjs/stylex";

// The same shop page in StyleX: 400 tiles × ~11 elements, responsive grid,
// container queries, focus rings, WCAG min-target ::before, dynamic rating width.
// Shared layers (srOnly / minTarget / focusRing) are stylex style objects composed
// at the element via stylex.props.
const desktop = "@media (min-width: 992px)";
const coarse = "@media (hover: none) and (pointer: coarse)";
const fine = "@media (hover: hover) and (pointer: fine)";
const reduce = "@media (prefers-reduced-motion: reduce)";
const wide = "@container tile (min-width: 240px)";

const shared = stylex.create({
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  minTarget: {
    "::before": {
      content: "''",
      position: "absolute",
      inset: "50%",
      translate: "-50% -50%",
      width: "100%",
      height: "100%",
      minWidth: { default: null, [coarse]: "44px", [fine]: "24px" },
      minHeight: { default: null, [coarse]: "44px", [fine]: "24px" },
    },
  },
  focusRing: {
    outline: { default: null, ":focus-visible": "2px solid #2563eb" },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
});

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      "@media (min-width: 640px)": "repeat(3, minmax(0, 1fr))",
      [desktop]: "repeat(4, minmax(0, 1fr))",
    },
    gap: { default: "8px", [desktop]: "16px" },
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    containerType: "inline-size",
    containerName: "tile",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: "8px",
    padding: "12px",
    backgroundColor: "#fff",
    transition: { default: "box-shadow 0.15s ease", [reduce]: "none" },
    boxShadow: { default: null, ":hover": "0 4px 12px rgba(0, 0, 0, 0.08)" },
  },
  imageWrap: {
    position: "relative",
    aspectRatio: "1",
    backgroundColor: "#f3f4f6",
    borderRadius: "6px",
    overflow: "hidden",
  },
  imagePlaceholder: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
  },
  badge: {
    position: "absolute",
    top: "6px",
    left: "6px",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "#f59e0b",
  },
  badgeHigh: { backgroundColor: "#dc2626" },
  wishlist: {
    position: "absolute",
    top: "6px",
    right: "6px",
    borderWidth: 0,
    borderRadius: "9999px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: 1,
    padding: "4px",
    color: { default: "#9ca3af", ":hover": "#ef4444" },
    transition: { default: "color 0.15s ease", [reduce]: "none" },
  },
  wishlistOn: { color: "#ef4444" },
  title: {
    margin: "8px 0 4px",
    fontSize: { default: "14px", [desktop]: "15px", [wide]: "16px" },
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rating: {
    height: "8px",
    borderRadius: "4px",
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  ratingFill: { height: "100%", backgroundColor: "#fbbf24" },
  fillW: (pct: number) => ({ width: `${pct}%` }),
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: { default: "6px", [wide]: "10px" },
    margin: "6px 0 10px",
  },
  oldPrice: { fontSize: "12px", color: "#9ca3af", textDecoration: "line-through" },
  nowPrice: { fontSize: "16px", fontWeight: 700, color: "#111827" },
  addToCart: {
    marginTop: "auto",
    position: "relative",
    borderWidth: 0,
    borderRadius: "6px",
    padding: { default: "8px 12px", [desktop]: "9px 12px" },
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: { default: "#2563eb", ":hover:not(:disabled)": "#1d4ed8" },
    cursor: "pointer",
    transition: { default: "background-color 0.15s ease", [reduce]: "none" },
  },
  addToCartDisabled: {
    backgroundColor: "#d1d5db",
    color: "#6b7280",
    cursor: "not-allowed",
  },
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
  <li {...stylex.props(styles.card)}>
    <div {...stylex.props(styles.imageWrap)}>
      <div aria-hidden="true" {...stylex.props(styles.imagePlaceholder)} />
      {p.discount > 0 && (
        <span {...stylex.props(styles.badge, p.discount >= 30 && styles.badgeHigh)}>
          <span {...stylex.props(shared.srOnly)}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...stylex.props(styles.wishlist, shared.focusRing, shared.minTarget, p.wishlisted && styles.wishlistOn)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 {...stylex.props(styles.title)}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} {...stylex.props(styles.rating)}>
      <div aria-hidden="true" {...stylex.props(styles.ratingFill, styles.fillW((p.rating / 5) * 100))} />
    </div>
    <div {...stylex.props(styles.priceRow)}>
      {p.discount > 0 && (
        <span {...stylex.props(styles.oldPrice)}>
          <span {...stylex.props(shared.srOnly)}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span {...stylex.props(styles.nowPrice)}>
        {p.discount > 0 && <span {...stylex.props(shared.srOnly)}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      {...stylex.props(styles.addToCart, shared.focusRing, shared.minTarget, !p.inStock && styles.addToCartDisabled)}
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
