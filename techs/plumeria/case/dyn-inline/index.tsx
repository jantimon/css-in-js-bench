// bench-strategy: inline-style
// Function styles are Plumeria's inline-style path: one shared class holds the custom
// property and each element receives its value inline. The naive, idiomatic and inline
// controls therefore use the same mechanism.
import React, { type FunctionComponent } from "react";
import * as css from "@plumeria/core";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const styles = css.create({
  base: {
    display: "inline-block",
    width: 8,
    height: 8
  },
  dyn: (translateX: number = 0) => ({
    transform: `translateX(${translateX}px)`
  }),
});

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div classStyle={[styles.base, styles.dyn(translateX)]}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
