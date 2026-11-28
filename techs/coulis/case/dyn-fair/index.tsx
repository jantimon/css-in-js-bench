// bench-strategy: inline-style
// Coulis — the documented best practice for a fully dynamic value: static styles are
// created once in the module scope (ONE set of class names for all instances) and the
// per-instance transform is a plain inline style, so no per-value rule is created.
import React from "react";
import { createStyles } from "../../coulis";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const dot = createStyles({ display: "inline-block", width: 8, height: 8 });

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <div className={dot} style={{ transform: `translateX(${translateX}px)` }}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
