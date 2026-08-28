// bench-strategy: variant-ladder-style-values
// Emotion — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
import React from "react";
import styled from "@emotion/styled";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

// One styled component, three interpolated fragments — the runtime serialises the
// ladder once per class, not once per level per render.
const GhostPrimaryButton = styled.button`
  ${button};
  ${ghostButton};
  ${ghostPrimaryButton};
`;

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
