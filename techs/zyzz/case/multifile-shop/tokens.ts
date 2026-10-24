// The design system's shared fragments: the visually-hidden helper the page uses in three
// places, the focus ring and the WCAG tap target. No JSX use site lives in this module.
import { style } from "../../zyzz.config";

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export const focusRing = style({
  ":focus-visible": { outline: "2px solid #2563eb", outlineOffset: "2px" },
});

export const minTarget = style({
  "::before": {
    content: '""',
    position: "absolute",
    inset: "50%",
    translate: "-50% -50%",
    width: "100%",
    height: "100%",
    "@media (hover: none) and (pointer: coarse)": { minWidth: "44px", minHeight: "44px" },
    "@media (hover: hover) and (pointer: fine)": { minWidth: "24px", minHeight: "24px" },
  },
});
