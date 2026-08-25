// bench-strategy: variant-ladder-style-values
// Panda (style props) — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
// @ts-nocheck
import React from "react";
import { styled } from "styled-system/jsx";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <styled.button css={[button, ghostButton, ghostPrimaryButton]}>{children}</styled.button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
