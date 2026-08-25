import React from "react";
import { GhostButton } from "./ghost-button";

export const GhostPrimaryButton = ({ children }: { children?: React.ReactNode }) => (
  <GhostButton className="btn-ghost-primary">{children}</GhostButton>
);
