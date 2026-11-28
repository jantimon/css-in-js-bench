// @ts-nocheck
import React from "react";
import { Button } from "./button";

const ghost = {
  backgroundColor: "transparent",
  borderColor: "#d1d5db",
  color: "#374151",
};

export const GhostButton = ({ styles, children }: { styles?: object; children?: React.ReactNode }) => (
  <Button styles={{ ...ghost, ...styles }}>{children}</Button>
);
