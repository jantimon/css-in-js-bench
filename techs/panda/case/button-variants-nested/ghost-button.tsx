// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { Button } from "./button";

const ghost = css.raw({
  background: "transparent",
  borderColor: "oklch(87.2% 0.01 258.338)",
  color: "oklch(37.3% 0.034 259.733)",
});

export const GhostButton = ({ styles, className, children }: { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode }) => (
  <Button styles={css.raw(ghost, styles)} className={className}>{children}</Button>
);
