// @ts-nocheck
import React from "react";
import { GhostButton } from "./ghost-button";

const ghostPrimary = {
  borderColor: "#2563eb",
  color: "#2563eb",
};

export const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <GhostButton styles={ghostPrimary}>{children}</GhostButton>
);
