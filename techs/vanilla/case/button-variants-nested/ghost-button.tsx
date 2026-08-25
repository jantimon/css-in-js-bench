import React from "react";
import { Button } from "./button";

export const GhostButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <Button className={className ? `btn-ghost ${className}` : "btn-ghost"}>{children}</Button>
);
