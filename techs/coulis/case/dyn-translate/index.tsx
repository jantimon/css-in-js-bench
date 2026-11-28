// Coulis — dyn-translate, the value written directly: every distinct translateX goes
// through createStyles at render, so each instance creates its own atomic rule.
import React from "react";
import { createStyles } from "../../coulis";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <div className={createStyles({ display: "inline-block", width: 8, height: 8, transform: `translateX(${translateX}px)` })}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
