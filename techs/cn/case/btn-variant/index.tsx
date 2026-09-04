// cn — a variant button whose class list is assembled from conditional utility
// fragments and concatenated by cn's cn() on EVERY render (next-yak did this at build
// time). Default-exports a single-instance render(i) (§6); the harness loops it. The
// per-item prop shape is verbatim from the cnfast lane, so the pair isolates the merge engine.
import React, { type FunctionComponent } from "react";
import { cn } from "cn";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
}

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <button className={cn(
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white",
    !$active && "bg-gray-300 text-gray-500",
    $variant === "secondary" && "bg-gray-100 text-gray-900",
    $variant === "ghost" && "bg-transparent text-blue-600",
    $fullWidth && "w-full",
  )}>{children}</button>
);

export default (i: number) => {
  const variant = (["primary", "secondary", "ghost"] as const)[i % 3];
  return (
    <Button
      $active={i % 4 !== 0}
      $fullWidth={i % 3 === 0}
      $variant={variant}
    >
      {i}
    </Button>
  );
};
