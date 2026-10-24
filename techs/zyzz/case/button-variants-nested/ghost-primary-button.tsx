import React from "react";
import { style } from "../../zyzz.config";
import { GhostButton } from "./ghost-button";

export const GhostPrimaryButton = (props: { children?: React.ReactNode }) => (
  <GhostButton {...styles.ghostPrimary()}>{props.children}</GhostButton>
);

namespace styles {
  export const ghostPrimary = style({
    borderColor: "#2563eb",
    color: "#2563eb",
  });
}
