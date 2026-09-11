// bench-strategy: variant-ladder-jsx-components
// vanilla-solid — button-variants-nested. Three modules, each exporting a JSX COMPONENT:
// Button, GhostButton extending it, GhostPrimaryButton extending that. The module API is
// the component, so every lane wraps — the page only renders the leaf.
import { GhostPrimaryButton } from "./ghost-primary-button";

// The wrapper chain with no library behind it: three components, one element, plain
// string concatenation per level. The floor the merges are measured against.
export default (i: () => number) => <GhostPrimaryButton>{i()}</GhostPrimaryButton>;
