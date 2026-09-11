// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { GhostButton } from "./ghost-button";

const ghostPrimary = css.raw({
  borderColor: "#2563eb",
  color: "#2563eb",
});

export const GhostPrimaryButton = ({ styles, className, children }: { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode }) => (
  <GhostButton styles={css.raw(ghostPrimary, styles)} className={className}>{children}</GhostButton>
);
