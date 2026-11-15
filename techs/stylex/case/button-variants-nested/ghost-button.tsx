// @ts-nocheck
import React from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "./button";

const styles = stylex.create({
  ghost: {
    backgroundColor: "transparent",
    borderColor: "oklch(87.2% 0.01 258.338)",
    color: "oklch(37.3% 0.034 259.733)",
  },
});

export const GhostButton = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => (
  <Button xs={[styles.ghost, xs]}>{children}</Button>
);
