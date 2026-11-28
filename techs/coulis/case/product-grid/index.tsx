// @ts-nocheck
import React, { type FunctionComponent } from "react";
import { createStyles } from "../../coulis";

// The same shop page in Coulis: 400 tiles x ~11 elements, container queries, focus
// rings, WCAG min-target ::before, dynamic rating width. Static styles are created
// once in the module scope (variants pick between two class-name strings); only the
// rating width goes through createStyles at render (cached per value).

const srOnly = createStyles({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});
const minTarget = createStyles({
  content: { before: "''" },
  position: { before: "absolute" },
  inset: { before: "50%" },
  translate: { before: "-50% -50%" },
  width: { before: "100%" },
  height: { before: "100%" },
  minWidth: { beforeCoarse: 44, beforeFine: 24 },
  minHeight: { beforeCoarse: 44, beforeFine: 24 },
});
const focusRing = createStyles({
  outline: { focusVisible: "2px solid #2563eb" },
  outlineOffset: { focusVisible: 2 },
});

const card = createStyles({
  display: "flex",
  flexDirection: "column",
  containerType: "inline-size",
  containerName: "tile",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  backgroundColor: "#fff",
  transition: { base: "box-shadow 0.15s ease", reduce: "none" },
  boxShadow: { hover: "0 4px 12px rgba(0, 0, 0, 0.08)" },
});
const imageWrap = createStyles({
  position: "relative",
  aspectRatio: "1",
  backgroundColor: "#f3f4f6",
  borderRadius: 6,
  overflow: "hidden",
});
const imagePlaceholder = createStyles({
  position: "absolute",
  inset: 0,
  backgroundImage: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
});

const badgeBase = createStyles({
  position: "absolute",
  top: 6,
  left: 6,
  borderRadius: 4,
  padding: "2px 6px",
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
});
const badge = `${badgeBase} ${createStyles({ backgroundColor: "#f59e0b" })}`;
const badgeHigh = `${badgeBase} ${createStyles({ backgroundColor: "#dc2626" })}`;
const title = createStyles({
  margin: "8px 0 4px",
  fontSize: { base: 14, desktop: 15, wide: 16 },
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
const rating = createStyles({
  height: 8,
  borderRadius: 4,
  backgroundColor: "#e5e7eb",
  overflow: "hidden",
});
const ratingFill = createStyles({ height: "100%", backgroundColor: "#fbbf24" });
const priceRow = createStyles({
  display: "flex",
  alignItems: "baseline",
  gap: { base: 6, wide: 10 },
  margin: "6px 0 10px",
});
const oldPrice = createStyles({ fontSize: 12, color: "#9ca3af", textDecoration: "line-through" });
const nowPrice = createStyles({ fontSize: 16, fontWeight: 700, color: "#111827" });

const wishlistBase = `${createStyles({
  border: 0,
  cursor: "pointer",
  position: "absolute",
  top: 6,
  right: 6,
  borderRadius: 9999,
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  fontSize: 18,
  lineHeight: 1,
  padding: 4,
  transition: { base: "color 0.15s ease", reduce: "none" },
})} ${focusRing} ${minTarget}`;
const wishlist = `${wishlistBase} ${createStyles({ color: { base: "#9ca3af", hover: "#ef4444" } })}`;
const wishlistOn = `${wishlistBase} ${createStyles({ color: "#ef4444" })}`;
const addToCartStyles = {
  border: 0,
  cursor: "pointer",
  marginTop: "auto",
  position: "relative",
  borderRadius: 6,
  padding: { base: "8px 12px", desktop: "9px 12px" },
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: { base: "#2563eb", hoverEnabled: "#1d4ed8" },
  transition: { base: "background-color 0.15s ease", reduce: "none" },
};
const addToCart = `${createStyles(addToCartStyles)} ${focusRing} ${minTarget}`;
const addToCartDisabled = `${createStyles({
  ...addToCartStyles,
  backgroundColor: "#d1d5db",
  color: "#6b7280",
  cursor: "not-allowed",
})} ${focusRing} ${minTarget}`;

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
        <span className={p.discount >= 30 ? badgeHigh : badge}>
          <span className={srOnly}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={p.wishlisted ? wishlistOn : wishlist}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 className={title}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} className={rating}>
      <div aria-hidden="true" className={`${ratingFill} ${createStyles({ width: `${(p.rating / 5) * 100}%` })}`} />
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
      className={p.inStock ? addToCart : addToCartDisabled}
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
