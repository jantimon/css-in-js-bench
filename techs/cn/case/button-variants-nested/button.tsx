import React from "react";
import { cn } from "cn";

const BASE = "inline-flex items-center justify-center gap-1.5 border border-solid border-transparent rounded-md px-4 py-2 text-sm font-semibold cursor-pointer bg-blue-600 text-white";

export const Button = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <button className={cn(BASE, className)}>{children}</button>
);
