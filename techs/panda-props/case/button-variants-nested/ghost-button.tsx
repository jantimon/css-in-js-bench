// @ts-nocheck
import React from "react";
import { css } from "styled-system/css";
import { Button } from "./button";

const ghost = css.raw({
  background: "transparent",
  borderColor: "#d1d5db",
  color: "#374151",
});

export const GhostButton = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => (
  <Button xs={[ghost, xs]}>{children}</Button>
);
