// @ts-nocheck

// The design system's shared style fragments — plain style objects the primitive
// modules and the page pull in. css.raw is not needed here: panda cssgen reads these
// at their spread/`css=` sites.

export const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

export const minTargetSize = {
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
} as const;

export const focusRing = {
  _focusVisible: {
    outline: "2px solid #2563eb",
    outlineOffset: "2px",
  },
} as const;
