// bench-strategy: variant-ladder-style-values
// Plumeria — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx merges all
// three onto ONE element, which is how Plumeria composes styles: a `classStyle` array is
// resolved at build time, right-wins, so the ladder collapses to a single flat class list
// with the losing atomic classes dropped entirely — no runtime merge and no dead classes.
// Paired with button-variants-nested, which ships the same ladder as a JSX component API;
// the pair prices the API shape, not the file layout (both split).
import React from "react";
import "@plumeria/core";
import { buttonStyles } from "./button";
import { ghostStyles } from "./ghost-button";
import { ghostPrimaryStyles } from "./ghost-primary-button";

const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <button classStyle={[buttonStyles.base, ghostStyles.ghost, ghostPrimaryStyles.ghostPrimary]}>
    {children}
  </button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
