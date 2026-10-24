import React, { type FunctionComponent } from "react";
import { cx } from "zyzz";
import { style } from "../../zyzz.config";

// The same shop page in Zyzz: 400 tiles × ~11 elements, container queries, focus rings,
// WCAG min-target ::before, (hover: hover)-guarded hover and reduced motion. Shared layers
// (srOnly / minTarget / focusRing) are composed into each definition at build time, state
// overrides are applied with cx, and the rating width is a typed callback bound to a CSS
// variable.
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
  <li {...styles.card()}>
    <div {...styles.image()}>
      <div aria-hidden="true" {...styles.placeholder()} />
      {p.discount > 0 && (
        <span {...cx(styles.badge(), p.discount >= 30 && styles.badgeHigh())}>
          <span {...styles.srOnly()}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...cx(styles.wish(), p.wishlisted && styles.wishOn())}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 {...styles.title()}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} {...styles.rating()}>
      <div aria-hidden="true" {...styles.ratingFill({ width: `${(p.rating / 5) * 100}%` })} />
    </div>
    <div {...styles.price()}>
      {p.discount > 0 && (
        <span {...styles.priceOld()}>
          <span {...styles.srOnly()}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span {...styles.priceNow()}>
        {p.discount > 0 && <span {...styles.srOnly()}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      {...cx(styles.cart(), !p.inStock && styles.cartDisabled())}
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

namespace styles {
  export const srOnly = style({
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  });

  export const focusRing = style({
    ":focus-visible": { outline: "2px solid #2563eb", outlineOffset: "2px" },
  });

  export const minTarget = style({
    "::before": {
      content: '""',
      position: "absolute",
      inset: "50%",
      translate: "-50% -50%",
      width: "100%",
      height: "100%",
      "@media (hover: none) and (pointer: coarse)": { minWidth: "44px", minHeight: "44px" },
      "@media (hover: hover) and (pointer: fine)": { minWidth: "24px", minHeight: "24px" },
    },
  });

  // Each tile is its own query container, so its children adapt to the column width
  // they land in, not the viewport.
  export const card = style({
    display: "flex",
    flexDirection: "column",
    containerType: "inline-size",
    containerName: "tile",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "12px",
    background: "#fff",
    transition: "box-shadow 0.15s ease",
    "@media (hover: hover)": { ":hover": { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" } },
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  });

  export const image = style({
    position: "relative",
    aspectRatio: 1,
    background: "#f3f4f6",
    borderRadius: "6px",
    overflow: "hidden",
  });

  export const placeholder = style({
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
  });

  export const badge = style({
    position: "absolute",
    top: "6px",
    left: "6px",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fff",
    background: "#f59e0b",
  });

  export const badgeHigh = style({ background: "#dc2626" });

  export const wish = style([
    {
      position: "absolute",
      top: "6px",
      right: "6px",
      border: "none",
      borderRadius: "9999px",
      background: "rgba(255, 255, 255, 0.8)",
      cursor: "pointer",
      fontSize: "18px",
      lineHeight: 1,
      padding: "4px",
      color: "#9ca3af",
      transition: "color 0.15s ease",
      "@media (hover: hover)": { ":hover": { color: "#ef4444" } },
      "@media (prefers-reduced-motion: reduce)": { transition: "none" },
    },
    focusRing,
    minTarget,
  ]);

  export const wishOn = style({ color: "#ef4444" });

  export const title = style({
    margin: "8px 0 4px",
    fontSize: "14px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    "@media (min-width: 992px)": { fontSize: "15px" },
    // Wider columns get a slightly larger title.
    "@container tile (min-width: 240px)": { fontSize: "16px" },
  });

  export const rating = style({
    height: "8px",
    borderRadius: "4px",
    background: "#e5e7eb",
    overflow: "hidden",
  });

  export const ratingFill = style((values: { width: `${number}%` }) => ({
    height: "100%",
    background: "#fbbf24",
    width: values.width,
  }));

  export const price = style({
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    margin: "6px 0 10px",
    // Roomier price row in wide columns.
    "@container tile (min-width: 240px)": { gap: "10px" },
  });

  export const priceOld = style({
    fontSize: "12px",
    color: "#9ca3af",
    textDecoration: "line-through",
  });

  export const priceNow = style({
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
  });

  export const cart = style([
    {
      marginTop: "auto",
      border: "none",
      borderRadius: "6px",
      padding: "8px 12px",
      fontSize: "14px",
      fontWeight: 600,
      color: "#fff",
      background: "#2563eb",
      cursor: "pointer",
      transition: "background-color 0.15s ease",
      position: "relative",
      "@media (hover: hover)": { selectors: { "&:hover:not(:disabled)": { background: "#1d4ed8" } } },
      "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      "@media (min-width: 992px)": { padding: "9px 12px" },
    },
    focusRing,
    minTarget,
  ]);

  export const cartDisabled = style({
    background: "#d1d5db",
    color: "#6b7280",
    cursor: "not-allowed",
  });
}
