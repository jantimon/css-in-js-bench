// bench-strategy: variant-ladder-style-values
// StyleX — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
// @ts-nocheck
import React from "react";
import * as stylex from "@stylexjs/stylex";
import { buttonStyles } from "./button";
import { ghostStyles } from "./ghost-button";
import { ghostPrimaryStyles } from "./ghost-primary-button";

// Later arguments win, so the ladder resolves base → ghost → ghost-primary on one
// element with no wrapper components.
const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <button {...stylex.props(buttonStyles.base, ghostStyles.ghost, ghostPrimaryStyles.ghostPrimary)}>
    {children}
  </button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
