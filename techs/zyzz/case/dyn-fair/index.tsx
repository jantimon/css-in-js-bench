// bench-strategy: dynamic-style-fn
// Zyzz — its typed style callback IS the documented path for runtime values (a static
// rule over a CSS variable bound inline), so this matches the dyn-translate lane.
import React, { type FunctionComponent } from "react";
import { style } from "../../zyzz.config";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

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
