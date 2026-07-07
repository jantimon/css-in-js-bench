// tailwind-merge — HIGH-cardinality dynamic transform: each instance bakes a unique
// translateX into an arbitrary-value utility, which twMerge(clsx()) must still parse and
// conflict-resolve on EVERY render. The naive form keeps the value in the class string
// (verbatim from the original twmerge dyn-translate lane). Default-exports render(i) (§6).
import React, { type FunctionComponent } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
const cn = (...a: any[]) => twMerge(clsx(a));

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div className={cn("inline-block w-2 h-2", "[transform:translateX(" + translateX + "px)]")}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
