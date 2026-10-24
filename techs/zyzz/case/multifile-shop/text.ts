// Copy, rating and price styles. No JSX use site lives in this module.
import { style } from "../../zyzz.config";

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
