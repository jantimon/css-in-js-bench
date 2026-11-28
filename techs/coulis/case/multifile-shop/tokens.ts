// @ts-nocheck
import { createStyles } from "../../coulis";

// The design system's shared style fragments: class names created once, pulled in by
// the primitive modules and the page.
export const srOnly = createStyles({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});
export const minTarget = createStyles({
  content: { before: "''" },
  position: { before: "absolute" },
  inset: { before: "50%" },
  translate: { before: "-50% -50%" },
  width: { before: "100%" },
  height: { before: "100%" },
  minWidth: { beforeCoarse: 44, beforeFine: 24 },
  minHeight: { beforeCoarse: 44, beforeFine: 24 },
});
export const focusRing = createStyles({
  outline: { focusVisible: "2px solid #2563eb" },
  outlineOffset: { focusVisible: 2 },
});
