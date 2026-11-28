// @ts-nocheck
import { createStyles } from "../../coulis";

// Structure bundles. Class names only: no JSX use site lives in this module.
export const card = createStyles({
  display: "flex",
  flexDirection: "column",
  containerType: "inline-size",
  containerName: "tile",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  backgroundColor: "#fff",
  transition: { base: "box-shadow 0.15s ease", reduce: "none" },
  boxShadow: { hover: "0 4px 12px rgba(0, 0, 0, 0.08)" },
});
export const imageWrap = createStyles({
  position: "relative",
  aspectRatio: "1",
  backgroundColor: "#f3f4f6",
  borderRadius: 6,
  overflow: "hidden",
});
export const imagePlaceholder = createStyles({
  position: "absolute",
  inset: 0,
  backgroundImage: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
});
