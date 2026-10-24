// Structure styles. No JSX use site lives in this module.
import { style } from "../../zyzz.config";

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
