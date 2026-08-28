import React from "react";
import { cn } from "cnfast";
import { Button } from "./button";

const GHOST = "bg-transparent border-gray-300 text-gray-700";

export const GhostButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <Button className={cn(GHOST, className)}>{children}</Button>
);
