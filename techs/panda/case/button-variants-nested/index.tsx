// bench-strategy: variant-ladder-jsx-components
// Panda (css fn) — button-variants-nested. Three modules, each exporting a JSX COMPONENT:
// Button, GhostButton extending it, GhostPrimaryButton extending that. The module
// API is the component, so every lane wraps — the page only renders the leaf.
// Paired with button-variants (same ladder as style values merged at one element).
// @ts-nocheck
import React from "react";
import { GhostPrimaryButton } from "./ghost-primary-button";

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
