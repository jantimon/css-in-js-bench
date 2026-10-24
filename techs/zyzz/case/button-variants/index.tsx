// bench-strategy: variant-ladder-style-values
// Zyzz — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
import React from "react";
import { cx } from "zyzz";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

// cx resolves the ladder at build time: later arguments win, and the call selects one
// precompiled class list.
const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <button {...cx(button(), ghostButton(), ghostPrimaryButton())}>{children}</button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
