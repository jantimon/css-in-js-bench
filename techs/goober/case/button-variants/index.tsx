// bench-strategy: variant-ladder-style-values
// Goober — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
import React from "react";
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

// goober needs setup(React.createElement, …) before any styled() renders.
setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

const GhostPrimaryButton = styled("button")`
  ${button}
  ${ghostButton}
  ${ghostPrimaryButton}
`;

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
