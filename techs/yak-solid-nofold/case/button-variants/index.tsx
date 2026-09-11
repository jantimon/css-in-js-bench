// bench-strategy: variant-ladder-style-values
// @yak/solid — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx
// merges all three onto ONE element, which is how this library composes styles.
// Paired with button-variants-nested, which ships the same ladder as a JSX
// component API — the pair prices the API shape, not the file layout (both split).
import { styled } from "@yak/solid";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

// The styled component is declared AND used here, so the fold applies even though
// all three fragments crossed a module boundary: interpolated css values are
// resolved at build time, and only the element folds.
const GhostPrimaryButton = styled.button`
  ${button};
  ${ghostButton};
  ${ghostPrimaryButton};
`;

export default (i: () => number) => <GhostPrimaryButton>{i()}</GhostPrimaryButton>;
