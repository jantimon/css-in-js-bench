// @ts-nocheck
import { css } from "styled-system/css";

// The design system's shared style fragments. No elements here — only the mixins the
// primitive modules and the page pull in, so the fan-out across modules is real.

export const srOnly = css({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
});

export const minTargetSize = css({
  _before: {
    content: '""',
    position: "absolute",
    inset: "50%",
    translate: "-50% -50%",
    width: "100%",
    height: "100%",
  },
  "@media (hover: none) and (pointer: coarse)": {
    _before: {
      minWidth: "44px",
      minHeight: "44px",
    },
  },
  "@media (hover: hover) and (pointer: fine)": {
    _before: {
      minWidth: "24px",
      minHeight: "24px",
    },
  },
});

export const focusRing = css({
  _focusVisible: {
    outline: "2px solid #2563eb",
    outlineOffset: "2px",
  },
});
