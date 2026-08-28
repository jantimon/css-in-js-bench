import React from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));
import { Button } from "./button";

const GHOST = "bg-transparent border-gray-300 text-gray-700";

export const GhostButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <Button className={cn(GHOST, className)}>{children}</Button>
);
