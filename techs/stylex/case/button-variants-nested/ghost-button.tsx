// @ts-nocheck
import React from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "./button";

const styles = stylex.create({
  ghost: {
    backgroundColor: "transparent",
    borderColor: "#d1d5db",
    color: "#374151",
  },
});

export const GhostButton = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => (
  <Button xs={[styles.ghost, xs]}>{children}</Button>
);
