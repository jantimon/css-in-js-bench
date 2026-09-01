import * as css from "@plumeria/core";

import { media } from "./tokens.static";

// Structure bundles. Declarations only — no JSX use site lives in this module.
export const layoutStyles = css.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    padding: 0,
    margin: 0,
    listStyle: "none",
    [media.desktop]: {
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 16
    },
    "@media (min-width: 640px)": {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
    }
  },
  card: {
    display: "flex",
    flexDirection: "column",
    padding: 12,
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 8,
    transition: "box-shadow 0.15s ease",
    containerType: "inline-size",
    containerName: "tile",
    [media.reduce]: {
      transition: "none"
    },
    ":hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
    }
  },
  imageWrap: {
    position: "relative",
    aspectRatio: "1",
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderRadius: 6
  },
  imagePlaceholder: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
  },
});
