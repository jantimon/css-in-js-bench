// bench-strategy: variant-ladder-jsx-components
// Coulis — button-variants-nested. Three modules, each exporting a JSX COMPONENT:
// Button, GhostButton extending it, GhostPrimaryButton extending that. Each level
// hands its style overrides down; the leaf resolves them with one createStyles call.
import React from "react";
import { GhostPrimaryButton } from "./ghost-primary-button";

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
