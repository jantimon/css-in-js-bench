// bench-strategy: variant-ladder-style-values
// next-yak (css prop) — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
/** @jsxImportSource next-yak */
import React from "react";
import { css } from "next-yak";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

// The css prop folds on the element where it is written, so the three imported
// fragments collapse into one class on one host tag.
const GhostPrimaryButton: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
  <button
    css={css`
      ${button};
      ${ghostButton};
      ${ghostPrimaryButton};
    `}
  >
    {children}
  </button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
