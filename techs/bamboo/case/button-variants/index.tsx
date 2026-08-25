// bench-strategy: variant-ladder-style-values
// Bamboo — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
// @ts-nocheck
import React from "react";
import { cx } from "styled-system/css";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <button className={cx(button, ghostButton, ghostPrimaryButton)}>{children}</button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
