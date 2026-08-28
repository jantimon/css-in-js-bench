// @ts-nocheck
import React from "react";
import * as stylex from "@stylexjs/stylex";
import { GhostButton } from "./ghost-button";

const styles = stylex.create({
  ghostPrimary: {
    borderColor: "#2563eb",
    color: "#2563eb",
  },
});

export const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <GhostButton xs={[styles.ghostPrimary]}>{children}</GhostButton>
);
