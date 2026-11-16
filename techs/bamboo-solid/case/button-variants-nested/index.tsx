// bench-strategy: variant-ladder-jsx-components
// Bamboo Solid — button-variants-nested. Three modules, each exporting a JSX COMPONENT:
// Button, GhostButton extending it, GhostPrimaryButton extending that. The module API is
// the component, so every lane wraps — the page only renders the leaf. Each level joins
// its own precompiled class with the one handed down through cx().
// @ts-nocheck
import { GhostPrimaryButton } from "./ghost-primary-button";

export default (i: () => number) => <GhostPrimaryButton>{i()}</GhostPrimaryButton>;
