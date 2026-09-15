// bench-strategy: inline-style
// cn — the documented best practice for a fully dynamic value: keep the utility
// list static (cn() sees the same cacheable input every render) and pass the
// per-instance transform as an inline style instead of baking it into an
// arbitrary-value class. Default-exports render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from "react";
import { cn } from "cn";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div className={cn("inline-block w-2 h-2")} style={{ transform: `translateX(${translateX}px)` }}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
