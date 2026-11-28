// @ts-nocheck
import { createStyles } from "../../coulis";

// Copy, rating and price bundles. Class names only: no JSX use site lives here.
export const badgeBase = createStyles({
  position: "absolute",
  top: 6,
  left: 6,
  borderRadius: 4,
  padding: "2px 6px",
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
});
export const badge = `${badgeBase} ${createStyles({ backgroundColor: "#f59e0b" })}`;
export const badgeHigh = `${badgeBase} ${createStyles({ backgroundColor: "#dc2626" })}`;
export const title = createStyles({
  margin: "8px 0 4px",
  fontSize: { base: 14, desktop: 15, wide: 16 },
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
export const rating = createStyles({
  height: 8,
  borderRadius: 4,
  backgroundColor: "#e5e7eb",
  overflow: "hidden",
});
export const ratingFill = createStyles({ height: "100%", backgroundColor: "#fbbf24" });
export const priceRow = createStyles({
  display: "flex",
  alignItems: "baseline",
  gap: { base: 6, wide: 10 },
  margin: "6px 0 10px",
});
export const oldPrice = createStyles({ fontSize: 12, color: "#9ca3af", textDecoration: "line-through" });
export const nowPrice = createStyles({ fontSize: 16, fontWeight: 700, color: "#111827" });
