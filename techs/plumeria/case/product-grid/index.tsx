// Shared layers are composed at each element through `classStyle`. Plumeria nesting is
// one-directional, so conditional target sizes use `@media { "::before": { … } }`
// rather than placing the media query inside the pseudo-selector.
import React, { type FunctionComponent } from "react";
import * as css from "@plumeria/core";

const desktop = "@media (min-width: 992px)";
const coarse = "@media (hover: none) and (pointer: coarse)";
const fine = "@media (hover: hover) and (pointer: fine)";
const reduce = "@media (prefers-reduced-motion: reduce)";
const wide = "@container tile (min-width: 240px)";

const shared = css.create({
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    borderWidth: 0,
    clip: "rect(0, 0, 0, 0)"
  },
  minTarget: {
    "::before": {
      position: "absolute",
      inset: "50%",
      width: "100%",
      height: "100%",
      content: '""',
      translate: "-50% -50%"
    },
    [coarse]: {
      "::before": {
        minWidth: 44,
        minHeight: 44
      }
    },
    [fine]: {
      "::before": {
        minWidth: 24,
        minHeight: 24
      }
    }
  },
  focusRing: {
    ":focus-visible": {
      outline: "2px solid oklch(54.6% 0.245 262.881)",
      outlineOffset: 2
    },
  },
});

const styles = css.create({
  card: {
    display: "flex",
    flexDirection: "column",
    padding: 12,
    backgroundColor: "#fff",
    borderColor: "oklch(92.8% 0.006 264.531)",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 8,
    transition: "box-shadow 0.15s ease",
    containerType: "inline-size",
    containerName: "tile",
    ":hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
    },
    [reduce]: {
      transition: "none"
    }
  },
  imageWrap: {
    position: "relative",
    aspectRatio: "1",
    overflow: "hidden",
    backgroundColor: "oklch(96.7% 0.003 264.542)",
    borderRadius: 6
  },
  imagePlaceholder: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(135deg in oklab, #f3f4f6 0%, #e5e7eb 100%)",
  },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    padding: "2px 6px",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "oklch(76.9% 0.188 70.08)",
    borderRadius: 4
  },
  badgeHigh: {
    backgroundColor: "oklch(57.7% 0.245 27.325)"
  },
  wishlist: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
    fontSize: 18,
    lineHeight: 1,
    color: "oklch(70.7% 0.022 261.325)",
    cursor: "pointer",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderWidth: 0,
    borderRadius: 9999,
    transition: "color 0.15s ease",
    ":hover": {
      color: "oklch(63.7% 0.237 25.331)"
    },
    [reduce]: {
      transition: "none"
    }
  },
  wishlistOn: {
    color: "oklch(63.7% 0.237 25.331)"
  },
  title: {
    margin: "8px 0 4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: "nowrap",
    [desktop]: {
      fontSize: 15
    },
    [wide]: {
      fontSize: 16
    }
  },
  rating: {
    height: 8,
    overflow: "hidden",
    backgroundColor: "oklch(92.8% 0.006 264.531)",
    borderRadius: 4
  },
  ratingFill: {
    height: "100%",
    backgroundColor: "oklch(82.8% 0.189 84.429)"
  },
  fillW: (pct: number = 0) => ({
    width: `${pct}%`
  }),
  priceRow: {
    display: "flex",
    gap: 6,
    alignItems: "baseline",
    margin: "6px 0 10px",
    [wide]: {
      gap: 10
    }
  },
  oldPrice: {
    fontSize: 12,
    color: "oklch(70.7% 0.022 261.325)",
    textDecoration: "line-through"
  },
  nowPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: "oklch(21% 0.034 264.665)"
  },
  addToCart: {
    position: "relative",
    padding: "8px 12px",
    marginTop: "auto",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
    backgroundColor: "oklch(54.6% 0.245 262.881)",
    borderWidth: 0,
    borderRadius: 6,
    transition: "background-color 0.15s ease",
    ":hover:not(:disabled)": {
      backgroundColor: "oklch(48.8% 0.243 264.376)"
    },
    [desktop]: {
      padding: "9px 12px"
    },
    [reduce]: {
      transition: "none"
    }
  },
  addToCartDisabled: {
    color: "oklch(55.1% 0.027 264.364)",
    cursor: "not-allowed",
    backgroundColor: "oklch(87.2% 0.01 258.338)"
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
  <li classStyle={styles.card}>
    <div classStyle={styles.imageWrap}>
      <div aria-hidden="true" classStyle={styles.imagePlaceholder} />
      {p.discount > 0 && (
        <span classStyle={[styles.badge, p.discount >= 30 && styles.badgeHigh]}>
          <span classStyle={shared.srOnly}>Reduced by </span>-{p.discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        classStyle={[styles.wishlist, shared.focusRing, shared.minTarget, p.wishlisted && styles.wishlistOn]}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 classStyle={styles.title}>{p.title}</h3>
    <div role="img" aria-label={`Rated ${p.rating} out of 5`} classStyle={styles.rating}>
      <div aria-hidden="true" classStyle={[styles.ratingFill, styles.fillW((p.rating / 5) * 100)]} />
    </div>
    <div classStyle={styles.priceRow}>
      {p.discount > 0 && (
        <span classStyle={styles.oldPrice}>
          <span classStyle={shared.srOnly}>Was </span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </span>
      )}
      <span classStyle={styles.nowPrice}>
        {p.discount > 0 && <span classStyle={shared.srOnly}>Now </span>}${p.price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      classStyle={[styles.addToCart, shared.focusRing, shared.minTarget, !p.inStock && styles.addToCartDisabled]}
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
