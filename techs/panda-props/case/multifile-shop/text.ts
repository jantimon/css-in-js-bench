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
  background: "oklch(76.9% 0.188 70.08)",
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
  background: "oklch(92.8% 0.006 264.531)",
  overflow: "hidden",
} as const;

export const ratingFill = {
  height: "100%",
  background: "oklch(82.8% 0.189 84.429)",
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
  color: "oklch(70.7% 0.022 261.325)",
  textDecoration: "line-through",
} as const;

export const nowPrice = {
  fontSize: "16px",
  fontWeight: "700",
  color: "oklch(21% 0.034 264.665)",
} as const;
