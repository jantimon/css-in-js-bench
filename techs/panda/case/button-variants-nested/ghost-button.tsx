// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { Button } from "./button";

const ghost = css.raw({
  background: "transparent",
  borderColor: "#d1d5db",
  color: "#374151",
});

export const GhostButton = ({ styles, className, children }: { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode }) => (
  <Button styles={css.raw(ghost, styles)} className={className}>{children}</Button>
);
