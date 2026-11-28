// bench-strategy: variant-ladder-style-values
// Coulis — button-variants. Three modules, each exporting a STYLE VALUE (a plain
// object). Atomic class names cannot override each other by order, so the ladder is
// merged as objects (later wins) and resolved by one createStyles call, made once in
// the module scope since no value depends on props.
import React from "react";
import { createStyles } from "../../coulis";
import { buttonStyles } from "./button";
import { ghostStyles } from "./ghost-button";
import { ghostPrimaryStyles } from "./ghost-primary-button";

const ghostPrimaryButton = createStyles({ ...buttonStyles, ...ghostStyles, ...ghostPrimaryStyles });

const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <button className={ghostPrimaryButton}>{children}</button>
);

export default (i: number) => <GhostPrimaryButton>{i}</GhostPrimaryButton>;
