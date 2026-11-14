// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { GhostButton } from "./ghost-button";

const ghostPrimary = css.raw({
  borderColor: "oklch(54.6% 0.245 262.881)",
  color: "oklch(54.6% 0.245 262.881)",
});

export const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <GhostButton xs={[ghostPrimary]}>{children}</GhostButton>
);
