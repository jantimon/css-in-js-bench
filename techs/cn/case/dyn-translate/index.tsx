// cn — HIGH-cardinality dynamic transform: each instance bakes a unique translateX
// into an arbitrary-value utility, concatenated by cn's cn() on EVERY render. The
// naive form keeps the value in the class string (verbatim from the original cn
// dyn-translate lane). Default-exports a single-instance render(i) (§6).
import React, { type FunctionComponent } from "react";
import { cn } from "cn";

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
