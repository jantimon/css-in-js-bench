// @ts-nocheck
import * as stylex from "@stylexjs/stylex";

import { media } from "./tokens.stylex";

// The design system's shared style fragments. No elements here — only the bundles the
// primitive modules and the page pull in, so the fan-out across modules is real.

export const shared = stylex.create({
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  minTarget: {
    "::before": {
      content: "''",
      position: "absolute",
      inset: "50%",
      translate: "-50% -50%",
      width: "100%",
      height: "100%",
      minWidth: { default: null, [media.coarse]: "44px", [media.fine]: "24px" },
      minHeight: { default: null, [media.coarse]: "44px", [media.fine]: "24px" },
    },
  },
  focusRing: {
    outline: { default: null, ":focus-visible": "2px solid #2563eb" },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
});
