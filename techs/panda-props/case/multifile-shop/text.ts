// @ts-nocheck

// Copy, rating and price bundles. Declarations only — no JSX use site lives here.

export const badge = {
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

export const title = {
  margin: "8px 0 4px",
  fontSize: "14px",
  fontWeight: "500",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

export const titleCss = {
  "@media (min-width: 992px)": {
    fontSize: "15px",
  },
  // Wider columns get a slightly larger title.
  "@container tile (min-width: 240px)": {
    fontSize: "16px",
  },
} as const;

export const rating = {
  height: "8px",
  borderRadius: "4px",
  background: "#e5e7eb",
  overflow: "hidden",
} as const;

export const ratingFill = {
  height: "100%",
  background: "#fbbf24",
} as const;

export const priceRow = {
  display: "flex",
  alignItems: "baseline",
  gap: "6px",
  margin: "6px 0 10px",
} as const;

export const priceRowCss = {
  // Roomier price row in wide columns.
  "@container tile (min-width: 240px)": {
    gap: "10px",
  },
} as const;

export const oldPrice = {
  fontSize: "12px",
  color: "#9ca3af",
  textDecoration: "line-through",
} as const;

export const nowPrice = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#111827",
} as const;
