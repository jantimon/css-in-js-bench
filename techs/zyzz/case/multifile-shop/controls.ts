// The two tap targets, composed from the shared fragments in tokens.ts at build time.
// No JSX use site lives in this module.
import { style } from "../../zyzz.config";
import { focusRing, minTarget } from "./tokens";

export const wish = style([
  {
    position: "absolute",
    top: "6px",
    right: "6px",
    border: "none",
    borderRadius: "9999px",
    background: "rgba(255, 255, 255, 0.8)",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: 1,
    padding: "4px",
    color: "#9ca3af",
    transition: "color 0.15s ease",
    "@media (hover: hover)": { ":hover": { color: "#ef4444" } },
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  },
  focusRing,
  minTarget,
]);

export const wishOn = style({ color: "#ef4444" });

export const cart = style([
  {
    marginTop: "auto",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    background: "#2563eb",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    position: "relative",
    "@media (hover: hover)": { selectors: { "&:hover:not(:disabled)": { background: "#1d4ed8" } } },
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
    "@media (min-width: 992px)": { padding: "9px 12px" },
  },
  focusRing,
  minTarget,
]);

export const cartDisabled = style({
  background: "#d1d5db",
  color: "#6b7280",
  cursor: "not-allowed",
});
