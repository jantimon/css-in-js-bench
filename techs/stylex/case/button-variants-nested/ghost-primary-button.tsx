// @ts-nocheck
import React from "react";
import * as stylex from "@stylexjs/stylex";
import { GhostButton } from "./ghost-button";

const styles = stylex.create({
  ghostPrimary: {
    borderColor: "oklch(54.6% 0.245 262.881)",
    color: "oklch(54.6% 0.245 262.881)",
  },
});

export const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <GhostButton xs={[styles.ghostPrimary]}>{children}</GhostButton>
);
