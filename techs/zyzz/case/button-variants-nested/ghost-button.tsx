import React from "react";
import { style } from "../../zyzz.config";
import { Button } from "./button";

export const GhostButton = (props: { className?: string | undefined; children?: React.ReactNode }) => (
  <Button {...styles.ghost({ className: props.className })}>{props.children}</Button>
);

namespace styles {
  export const ghost = style({
    background: "transparent",
    borderColor: "#d1d5db",
    color: "#374151",
  });
}
