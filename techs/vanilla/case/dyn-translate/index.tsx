// vanilla lane — HIGH-cardinality dynamic transform done the speed-of-light way: a static
// class over author-written CSS (./styles.css) plus the per-instance value passed via an
// inline style, so no class string is generated per render. Default-exports render(i)
// (§6); the harness loops it. The dynamic-value handling is verbatim from the original
// vanilla dyn-translate lane.
import React, { type FunctionComponent } from "react";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div className="dynBase" style={{ transform: `translateX(${translateX}px)` }}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
