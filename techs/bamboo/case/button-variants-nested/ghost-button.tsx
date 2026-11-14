// @ts-nocheck
import React from "react";
import { css, cx } from "styled-system/css";
import { Button } from "./button";

// Selector specificity gives each wrapper priority over the style it extends.
const ghost = css({
  "&&": {
    background: "transparent",
    borderColor: "oklch(87.2% 0.01 258.338)",
    color: "oklch(37.3% 0.034 259.733)",
  },
});

export const GhostButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <Button className={cx(ghost, className)}>{children}</Button>
);
