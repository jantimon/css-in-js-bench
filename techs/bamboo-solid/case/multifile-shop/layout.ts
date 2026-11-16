// @ts-nocheck
import { css } from "styled-system/css";

// Structure styles. Declarations only — no JSX use site lives in this module.

export const grid = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  margin: "0",
  padding: "0",
  listStyle: "none",
  "@media (min-width: 640px)": {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  "@media (min-width: 992px)": {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },
});

export const card = css({
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
});

export const imageWrap = css({
  position: "relative",
  aspectRatio: "1",
  background: "#f3f4f6",
  borderRadius: "6px",
  overflow: "hidden",
});

export const imagePlaceholder = css({
  position: "absolute",
  inset: "0",
  background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
});
