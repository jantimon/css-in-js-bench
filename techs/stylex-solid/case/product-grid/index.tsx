// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

// The same shop page in StyleX on Solid: 400 tiles × ~11 elements, responsive grid,
// container queries, focus rings, WCAG min-target ::before, dynamic rating width.
// Shared layers (srOnly / minTarget / focusRing) are stylex style objects composed
// at the element via stylex.attrs.
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
    outline: { default: null, ":focus-visible": "2px solid oklch(54.6% 0.245 262.881)" },
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
    borderColor: "oklch(92.8% 0.006 264.531)",
    borderRadius: "8px",
    padding: "12px",
    backgroundColor: "#fff",
    transition: { default: "box-shadow 0.15s ease", [reduce]: "none" },
    boxShadow: { default: null, ":hover": "0 4px 12px rgba(0, 0, 0, 0.08)" },
  },
  imageWrap: {
    position: "relative",
    aspectRatio: "1",
    backgroundColor: "oklch(96.7% 0.003 264.542)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  imagePlaceholder: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(135deg in oklab, #f3f4f6 0%, #e5e7eb 100%)",
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
    backgroundColor: "oklch(76.9% 0.188 70.08)",
  },
  badgeHigh: { backgroundColor: "oklch(57.7% 0.245 27.325)" },
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
    color: { default: "oklch(70.7% 0.022 261.325)", ":hover": "oklch(63.7% 0.237 25.331)" },
    transition: { default: "color 0.15s ease", [reduce]: "none" },
  },
  wishlistOn: { color: "oklch(63.7% 0.237 25.331)" },
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
    backgroundColor: "oklch(92.8% 0.006 264.531)",
    overflow: "hidden",
  },
  ratingFill: { height: "100%", backgroundColor: "oklch(82.8% 0.189 84.429)" },
  fillW: (pct: number) => ({ width: `${pct}%` }),
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: { default: "6px", [wide]: "10px" },
    margin: "6px 0 10px",
  },
  oldPrice: { fontSize: "12px", color: "oklch(70.7% 0.022 261.325)", textDecoration: "line-through" },
  nowPrice: { fontSize: "16px", fontWeight: 700, color: "oklch(21% 0.034 264.665)" },
  addToCart: {
    marginTop: "auto",
    position: "relative",
    borderWidth: 0,
    borderRadius: "6px",
    padding: { default: "8px 12px", [desktop]: "9px 12px" },
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: { default: "oklch(54.6% 0.245 262.881)", ":hover:not(:disabled)": "oklch(48.8% 0.243 264.376)" },
    cursor: "pointer",
    transition: { default: "background-color 0.15s ease", [reduce]: "none" },
  },
  addToCartDisabled: {
    backgroundColor: "oklch(87.2% 0.01 258.338)",
    color: "oklch(55.1% 0.027 264.364)",
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

const Tile = (props: { p: () => Product }) => (
  <li {...stylex.attrs(styles.card)}>
    <div {...stylex.attrs(styles.imageWrap)}>
      <div aria-hidden="true" {...stylex.attrs(styles.imagePlaceholder)} />
      {props.p().discount > 0 && (
        <span {...stylex.attrs(styles.badge, props.p().discount >= 30 && styles.badgeHigh)}>
          <span {...stylex.attrs(shared.srOnly)}>Reduced by </span>-{props.p().discount}%
        </span>
      )}
      <button
        type="button"
        aria-pressed={props.p().wishlisted ? "true" : "false"}
        aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...stylex.attrs(styles.wishlist, shared.focusRing, shared.minTarget, props.p().wishlisted && styles.wishlistOn)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
    <h3 {...stylex.attrs(styles.title)}>{props.p().title}</h3>
    <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} {...stylex.attrs(styles.rating)}>
      <div aria-hidden="true" {...stylex.attrs(styles.ratingFill, styles.fillW((props.p().rating / 5) * 100))} />
    </div>
    <div {...stylex.attrs(styles.priceRow)}>
      {props.p().discount > 0 && (
        <span {...stylex.attrs(styles.oldPrice)}>
          <span {...stylex.attrs(shared.srOnly)}>Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
        </span>
      )}
      <span {...stylex.attrs(styles.nowPrice)}>
        {props.p().discount > 0 && <span {...stylex.attrs(shared.srOnly)}>Now </span>}${props.p().price.toFixed(2)}
      </span>
    </div>
    <button
      disabled={!props.p().inStock}
      aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
      {...stylex.attrs(styles.addToCart, shared.focusRing, shared.minTarget, !props.p().inStock && styles.addToCartDisabled)}
    >
      {props.p().inStock ? "Add to cart" : "Sold out"}
    </button>
  </li>
);

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
