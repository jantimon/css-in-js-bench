// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { GhostButton } from "./ghost-button";

const ghostPrimary = css.raw({
  borderColor: "oklch(54.6% 0.245 262.881)",
  color: "oklch(54.6% 0.245 262.881)",
});

export const GhostPrimaryButton = ({ styles, className, children }: { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode }) => (
  <GhostButton styles={css.raw(ghostPrimary, styles)} className={className}>{children}</GhostButton>
);
