// bench-strategy: variant-ladder-style-values
// Plumeria on Solid — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx merges all
// three onto ONE element, which is how Plumeria composes styles: a `classStyle` array is
// resolved at build time, right-wins, so the ladder collapses to a single flat class list
// with the losing atomic classes dropped entirely — no runtime merge and no dead classes.
// The JSX-component form of this ladder has no cell here: a component may not pass a
// received style prop on to another component, so a style-accumulating chain caps at
// two levels.
import type { JSX } from "@solidjs/web";
import "@plumeria/core";
import { buttonStyles } from "./button";
import { ghostStyles } from "./ghost-button";
import { ghostPrimaryStyles } from "./ghost-primary-button";

const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <button classStyle={[buttonStyles.base, ghostStyles.ghost, ghostPrimaryStyles.ghostPrimary]}>
    {props.children}
  </button>
);

export default (i: () => number) => <GhostPrimaryButton>{i()}</GhostPrimaryButton>;
