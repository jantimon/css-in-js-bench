// @ts-nocheck
import React from "react";
import { css, cx } from "styled-system/css";
import { GhostButton } from "./ghost-button";

// Selector specificity gives each wrapper priority over the style it extends.
const ghostPrimary = css({
  "&&&": {
    borderColor: "oklch(54.6% 0.245 262.881)",
    color: "oklch(54.6% 0.245 262.881)",
  },
});

export const GhostPrimaryButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <GhostButton className={cx(ghostPrimary, className)}>{children}</GhostButton>
);
