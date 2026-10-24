import React, { type FunctionComponent } from "react";
import { style } from "../../zyzz.config";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

// A typed callback compiles to a static rule over a private CSS variable; each call binds
// the per-instance value to that variable through an inline style, creating no CSS.
const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div {...styles.dot({ transform: `translateX(${translateX}px)` })}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};

namespace styles {
  export const dot = style((values: { transform: `translateX(${number}px)` }) => ({
    display: "inline-block",
    width: "8px",
    height: "8px",
    transform: values.transform,
  }));
}
