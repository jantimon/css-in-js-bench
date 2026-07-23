// bench-strategy: inline-style
// tailwind-merge — the documented best practice for a fully dynamic value: keep the
// utility list static (twMerge(clsx()) sees the same cacheable input every render)
// and pass the per-instance transform as an inline style instead of baking it into
// an arbitrary-value class. Default-exports render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));

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
