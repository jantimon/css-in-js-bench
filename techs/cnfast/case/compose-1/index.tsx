// bench-strategy: compose-depth
// cnfast — compose-1, the depth-sweep control: one component running ONE cn() pass
// over only the compose-3 base-level utilities (one merge per level; depth 1 = one
// merge). Default-exports a single-instance render(i) (§6).
import React from "react";
import { cn } from "cnfast";

const ComposedButton = ({ className, children }: { className?: string; children?: React.ReactNode }) => <button className={cn("inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white", className)}>{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
