// @ts-nocheck

// Structure style bundles. Declarations only — no JSX use site lives in this module.

export const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  margin: "0",
  padding: "0",
  listStyle: "none",
} as const;

export const gridCss = {
  "@media (min-width: 640px)": {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  "@media (min-width: 992px)": {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },
} as const;

export const card = {
  display: "flex",
  flexDirection: "column",
  // Each tile is its own query container, so its children adapt to the column
  // width they land in — not the viewport.
  containerType: "inline-size",
  containerName: "tile",
  border: "1px solid oklch(92.8% 0.006 264.531)",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
  transition: "box-shadow 0.15s ease",
} as const;

export const cardCss = {
  "@media (hover: hover)": {
    _hover: {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    },
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
} as const;

export const imageWrap = {
  position: "relative",
  aspectRatio: "1",
  background: "oklch(96.7% 0.003 264.542)",
  borderRadius: "6px",
  overflow: "hidden",
} as const;

export const imagePlaceholder = {
  position: "absolute",
  inset: "0",
  background: "linear-gradient(135deg in oklab, #f3f4f6 0%, #e5e7eb 100%)",
} as const;
