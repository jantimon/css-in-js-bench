import * as css from "@plumeria/core";

import { media } from "./tokens.static";

// The design system's shared style fragments. No elements here — only the bundles the
// primitive modules and the page pull in, so the fan-out across modules is real.
export const shared = css.create({
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    borderWidth: 0,
    clip: "rect(0, 0, 0, 0)"
  },
  minTarget: {
    [media.coarse]: {
      "::before": {
        minWidth: 44,
        minHeight: 44
      }
    },
    [media.fine]: {
      "::before": {
        minWidth: 24,
        minHeight: 24
      }
    },
    "::before": {
      position: "absolute",
      inset: "50%",
      width: "100%",
      height: "100%",
      content: '""',
      translate: "-50% -50%"
    }
  },
  focusRing: {
    ":focus-visible": {
      outline: "2px solid #2563eb",
      outlineOffset: 2
    },
  },
});
