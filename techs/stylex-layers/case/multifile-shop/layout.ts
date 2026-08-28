// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

import { media } from "./tokens.stylex";

// Structure bundles. Declarations only — no JSX use site lives in this module.
export const layoutStyles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      "@media (min-width: 640px)": "repeat(3, minmax(0, 1fr))",
      [media.desktop]: "repeat(4, minmax(0, 1fr))",
    },
    gap: { default: "8px", [media.desktop]: "16px" },
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
    borderColor: "#e5e7eb",
    borderRadius: "8px",
    padding: "12px",
    backgroundColor: "#fff",
    transition: { default: "box-shadow 0.15s ease", [media.reduce]: "none" },
    boxShadow: { default: null, ":hover": "0 4px 12px rgba(0, 0, 0, 0.08)" },
  },
  imageWrap: {
    position: "relative",
    aspectRatio: "1",
    backgroundColor: "#f3f4f6",
    borderRadius: "6px",
    overflow: "hidden",
  },
  imagePlaceholder: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
  },
});
