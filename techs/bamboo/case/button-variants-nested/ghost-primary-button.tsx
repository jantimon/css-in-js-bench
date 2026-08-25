// @ts-nocheck
import React from "react";
import { css, cx } from "styled-system/css";
import { GhostButton } from "./ghost-button";

const ghostPrimary = css({
  borderColor: "#2563eb",
  color: "#2563eb",
});

export const GhostPrimaryButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <GhostButton className={cx(ghostPrimary, className)}>{children}</GhostButton>
);
