// bench-strategy: compose-depth
// cn — compose-6, the depth-sweep upper bracket: the compose-3 wrapper chain
// extended three more levels (L3–L5), each level prepending its own utility fragment
// and re-running cn's cn() so the class list is concatenated SIX times per
// render. Default-exports a single-instance render(i) (§6).
import React from "react";
import { cn } from "cn";

const L0 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <button className={cn("inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white", className)}>{children}</button>;
const L1 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L0 className={cn("[border-left:1px_solid_hsl(53_70%_50%)] [padding-left:2px]", className)}>{children}</L0>;
const L2 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L1 className={cn("[border-left:2px_solid_hsl(106_70%_50%)] [padding-left:4px]", className)}>{children}</L1>;
const L3 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L2 className={cn("[border-left:3px_solid_hsl(159_70%_50%)] [padding-left:6px]", className)}>{children}</L2>;
const L4 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L3 className={cn("[border-left:4px_solid_hsl(212_70%_50%)] [padding-left:8px]", className)}>{children}</L3>;
const L5 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L4 className={cn("[border-left:5px_solid_hsl(265_70%_50%)] [padding-left:10px]", className)}>{children}</L4>;
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
