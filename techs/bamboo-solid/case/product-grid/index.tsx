// @ts-nocheck
import { css, cx } from "styled-system/css";

// Bamboo Solid port of the product grid: the Bamboo React lane's styles over the
// vanilla-solid lane's tile, so the DOM, the CSS and the per-item data match both. The
// style objects are plain objects and css()/cx() run at the use site: the @bamboocss/vite
// compiler replaces each call with its class-string literal (a cx() over a condition with
// a ternary between two), before Solid compiles the JSX, so every static class lands in
// Solid's template and only the conditional ones are bindings — the same split as the
// vanilla-solid tile. The rating bar width is the one dynamic value, an inline style as in
// the Bamboo React lane: Bamboo rejects open runtime values at build time.

// --- shared layers ---------------------------------------------------------

/** Visually-hidden, still read by screen readers. */
const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
};

/** WCAG 2.5.5 minimum target size — grows the hit area without changing layout. */
const minTargetSize = {
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
};

const focusRing = {
  _focusVisible: {
    outline: "2px solid #2563eb",
    outlineOffset: "2px",
  },
};

// --- element styles --------------------------------------------------------

const card = {
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
};

const imageWrap = {
  position: "relative",
  aspectRatio: "1",
  background: "#f3f4f6",
  borderRadius: "6px",
  overflow: "hidden",
};

const imagePlaceholder = {
  position: "absolute",
  inset: "0",
  background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
};

const badge = {
  position: "absolute",
  top: "6px",
  left: "6px",
  borderRadius: "4px",
  padding: "2px 6px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#fff",
  background: "#f59e0b",
};
const badgeHigh = { background: "#dc2626" };

const wishlist = {
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
};
const wishlistOn = { color: "#ef4444" };

const title = {
  margin: "8px 0 4px",
  fontSize: "14px",
  fontWeight: "500",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  "@media (min-width: 992px)": {
    fontSize: "15px",
  },
  // The container rule takes priority over the viewport title size.
  "@container tile (min-width: 240px)": {
    "&&": { fontSize: "16px" },
  },
};

const rating = {
  height: "8px",
  borderRadius: "4px",
  background: "#e5e7eb",
  overflow: "hidden",
};

const ratingFill = {
  height: "100%",
  background: "#fbbf24",
};

const priceRow = {
  display: "flex",
  alignItems: "baseline",
  gap: "6px",
  margin: "6px 0 10px",
  // Roomier price row in wide columns.
  "@container tile (min-width: 240px)": {
    gap: "10px",
  },
};

const oldPrice = {
  fontSize: "12px",
  color: "#9ca3af",
  textDecoration: "line-through",
};

const nowPrice = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
};

const addToCart = {
  marginTop: "auto",
  _disabled: { background: "#d1d5db", color: "#6b7280", cursor: "not-allowed" },
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
};

interface Product {
  i: number;
  title: string;
  price: number;
  discount: number;
  rating: number;
  inStock: boolean;
  wishlisted: boolean;
}

const Tile = (props: { p: () => Product }) => {
  const pct = () => (props.p().rating / 5) * 100 + "%";
  return (
    <li class={css(card)}>
      <div class={css(imageWrap)}>
        <div aria-hidden="true" class={css(imagePlaceholder)} />
        {props.p().discount > 0 && (
          <span class={cx(css(badge), props.p().discount >= 30 && css(badgeHigh))}>
            <span class={css(srOnly)}>Reduced by </span>-{props.p().discount}%
          </span>
        )}
        <button
          type="button"
          aria-pressed={props.p().wishlisted ? "true" : "false"}
          aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          class={cx(css(wishlist, focusRing, minTargetSize), props.p().wishlisted && css(wishlistOn))}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </div>
      <h3 class={css(title)}>{props.p().title}</h3>
      <div role="img" aria-label={`Rated ${props.p().rating} out of 5`} class={css(rating)}>
        <div aria-hidden="true" class={css(ratingFill)} style={{ width: pct() }} />
      </div>
      <div class={css(priceRow)}>
        {props.p().discount > 0 && (
          <span class={css(oldPrice)}>
            <span class={css(srOnly)}>Was </span>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
          </span>
        )}
        <span class={css(nowPrice)}>
          {props.p().discount > 0 && <span class={css(srOnly)}>Now </span>}${props.p().price.toFixed(2)}
        </span>
      </div>
      <button
        disabled={!props.p().inStock}
        aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
        class={css(addToCart, focusRing, minTargetSize)}
      >
        {props.p().inStock ? "Add to cart" : "Sold out"}
      </button>
    </li>
  );
};

export default (i: () => number) => {
  // ONE product built from i with the same per-item formula as every other lane, cached on
  // the index as in the vanilla-solid lane: `Tile` reads the product many times per render.
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
