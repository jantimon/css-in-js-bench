// bench-strategy: inline-style
// vanilla lane — the dynamic value done the speed-of-light way: a static class over
// author-written CSS (./styles.css) plus the per-instance value passed via an inline
// style, so no class string is generated per render. This is already the idiomatic
// form, so it matches the dyn-translate lane. Default-exports render(i) (§6); the
// harness loops it.
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
