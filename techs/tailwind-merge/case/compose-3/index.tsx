// tailwind-merge — a 3-level wrapper chain (L2→L1→L0), each level prepending its own
// utility fragment and re-running twMerge(clsx()) so the class list is parsed and
// conflict-resolved THREE times per render (next-yak flattened this at build time).
// Default-exports a single-instance render(i) (§6). Sub-components are verbatim from the
// original twmerge compose-3 lane.
import React, { type FunctionComponent } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));

const L0 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <button className={cn("inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white", className)}>{children}</button>;
const L1 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L0 className={cn("[border-left:1px_solid_hsl(53_70%_50%)] [padding-left:2px]", className)}>{children}</L0>;
const L2 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L1 className={cn("[border-left:2px_solid_hsl(106_70%_50%)] [padding-left:4px]", className)}>{children}</L1>;
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
