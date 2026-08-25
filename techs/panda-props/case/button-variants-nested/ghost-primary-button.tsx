// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { GhostButton } from "./ghost-button";

const ghostPrimary = css.raw({
  borderColor: "#2563eb",
  color: "#2563eb",
});

export const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <GhostButton xs={[ghostPrimary]}>{children}</GhostButton>
);
