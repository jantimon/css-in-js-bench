// bench-strategy: variant-ladder-jsx-components
// tailwind-merge — button-variants-nested. Three modules, each exporting a JSX COMPONENT:
// Button, GhostButton extending it, GhostPrimaryButton extending that. The module
// API is the component, so every lane wraps — the page only renders the leaf.
// Paired with button-variants (same ladder as style values merged at one element).
import React from "react";
import { GhostPrimaryButton } from "./ghost-primary-button";

// Three levels, so the merge runs THREE times per render — once per wrapper.
export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
