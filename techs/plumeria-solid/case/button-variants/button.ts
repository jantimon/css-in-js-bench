import * as css from "@plumeria/core";

// The style value this module exports. Longhand border-* so the levels below can
// override the colour alone — the same split every atomic lane needs.
export const buttonStyles = css.create({
  base: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "20px",
    color: "#fff",
    cursor: "pointer",
    backgroundColor: "oklch(54.6% 0.245 262.881)",
    borderColor: "transparent",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 6
  },
});
