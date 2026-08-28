// @ts-nocheck
import React from "react";
import { css, cx } from "styled-system/css";
import { Button } from "./button";

const ghost = css({
  background: "transparent",
  borderColor: "#d1d5db",
  color: "#374151",
});

export const GhostButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <Button className={cx(ghost, className)}>{children}</Button>
);
