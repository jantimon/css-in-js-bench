// @ts-nocheck
import React, { type FunctionComponent } from "react";
import { styled } from "styled-system/jsx";

// Panda CSS style-props (JSX factory) port of the product grid: 400 product
// tiles, each composed of ~11 elements that mix static styles, conditional
// variants (sale badge, wishlist, stock), a dynamic value (the rating bar width)
// AND the things real production tiles ship: a responsive grid, hover guarded
// behind (hover: hover), :focus-visible rings, WCAG min-target-size ::before
// pseudo-elements on the tap targets, reduced-motion handling, a container query
// per tile, and a11y semantics. Instead of css() className strings, every host
// element is a `<styled.tag>` from styled-system/jsx. Panda 2.x style props accept
// only plain CSS properties — conditions, selectors and at-rules go through the
// `css` prop — so each element spreads its flat props and passes the nested rules
// via css={...} (still static module consts, extracted at build time by
// `panda cssgen`). The one dynamic value (rating bar width) is applied via an
// inline style, exactly like the vanilla/idiomatic lanes.

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
} as const;

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
} as const;

const focusRing = {
  _focusVisible: {
    outline: "2px solid #2563eb",
    outlineOffset: "2px",
  },
} as const;

// --- element style bundles -------------------------------------------------

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  margin: "0",
  padding: "0",
  listStyle: "none",
} as const;

const gridCss = {
  "@media (min-width: 640px)": {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  "@media (min-width: 992px)": {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },
} as const;

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
} as const;

const cardCss = {
  "@media (hover: hover)": {
    _hover: {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
} as const;

const imageWrap = {
  position: "relative",
  aspectRatio: "1",
  background: "#f3f4f6",
  borderRadius: "6px",
  overflow: "hidden",
} as const;

const imagePlaceholder = {
  position: "absolute",
  inset: "0",
  background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
} as const;

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
} as const;

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
} as const;

const wishlistCss = {
  "@media (hover: hover)": {
    _hover: {
      color: "#ef4444",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
} as const;

const title = {
  margin: "8px 0 4px",
  fontSize: "14px",
  fontWeight: "500",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

const titleCss = {
  "@media (min-width: 992px)": {
    fontSize: "15px",
  },
  // Wider columns get a slightly larger title.
  "@container tile (min-width: 240px)": {
    fontSize: "16px",
  },
} as const;

const rating = {
  height: "8px",
  borderRadius: "4px",
  background: "#e5e7eb",
  overflow: "hidden",
} as const;

// NOTE: the rating bar fill width is the one dynamic, per-card value (the yak
// template threads it through a CSS variable / inline width). Panda's style
// props must stay static for build-time extraction, so we keep every static rule
// here and apply the width via an inline `style` below — same final width, so the
// computed-style parity gate holds.
const ratingFill = {
  height: "100%",
  background: "#fbbf24",
} as const;

const priceRow = {
  display: "flex",
  alignItems: "baseline",
  gap: "6px",
  margin: "6px 0 10px",
} as const;

const priceRowCss = {
  // Roomier price row in wide columns.
  "@container tile (min-width: 240px)": {
    gap: "10px",
  },
} as const;

const oldPrice = {
  fontSize: "12px",
  color: "#9ca3af",
  textDecoration: "line-through",
} as const;

const nowPrice = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
} as const;

const addToCart = {
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
} as const;

const addToCartCss = {
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
} as const;

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
  <styled.li {...card} css={cardCss}>
    <styled.div {...imageWrap}>
      <styled.div aria-hidden="true" {...imagePlaceholder} />
      {p.discount > 0 && (
        <styled.span {...badge} background={p.discount >= 30 ? "#dc2626" : "#f59e0b"}>
          <styled.span {...srOnly}>Reduced by </styled.span>-{p.discount}%
        </styled.span>
      )}
      <styled.button
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        {...wishlist}
        css={[wishlistCss, focusRing, minTargetSize]}
        color={p.wishlisted ? "#ef4444" : "#9ca3af"}
      >
        <span aria-hidden="true">♥</span>
      </styled.button>
    </styled.div>
    <styled.h3 {...title} css={titleCss}>{p.title}</styled.h3>
    <styled.div role="img" aria-label={`Rated ${p.rating} out of 5`} {...rating}>
      <styled.div
        aria-hidden="true"
        {...ratingFill}
        style={{ width: (p.rating / 5) * 100 + "%" }}
      />
    </styled.div>
    <styled.div {...priceRow} css={priceRowCss}>
      {p.discount > 0 && (
        <styled.span {...oldPrice}>
          <styled.span {...srOnly}>Was </styled.span>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </styled.span>
      )}
      <styled.span {...nowPrice}>
        {p.discount > 0 && <styled.span {...srOnly}>Now </styled.span>}${p.price.toFixed(2)}
      </styled.span>
    </styled.div>
    <styled.button
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
      {...addToCart}
      css={[addToCartCss, focusRing, minTargetSize]}
      background={!p.inStock ? "#d1d5db" : "#2563eb"}
      color={!p.inStock ? "#6b7280" : "#fff"}
      cursor={!p.inStock ? "not-allowed" : "pointer"}
    >
      {p.inStock ? "Add to cart" : "Sold out"}
    </styled.button>
  </styled.li>
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
