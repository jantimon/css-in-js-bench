import React from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));
import { GhostButton } from "./ghost-button";

const GHOST_PRIMARY = "border-blue-600 text-blue-600";

export const GhostPrimaryButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <GhostButton className={cn(GHOST_PRIMARY, className)}>{children}</GhostButton>
);
