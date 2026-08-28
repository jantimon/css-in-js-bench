// bench-strategy: variant-ladder-style-values
// vanilla — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
import React from "react";
import { BUTTON } from "./button";
import { GHOST_BUTTON } from "./ghost-button";
import { GHOST_PRIMARY_BUTTON } from "./ghost-primary-button";

// No library, no merge — three literal class names on one element.
const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <button className={`${BUTTON} ${GHOST_BUTTON} ${GHOST_PRIMARY_BUTTON}`}>{children}</button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
