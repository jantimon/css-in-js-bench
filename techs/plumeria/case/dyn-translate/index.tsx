// Plumeria — HIGH-cardinality dynamic transform. There is no naive path to contrast
// with here: `css.create` only takes statically-analysable values, so a runtime value
// goes through a function key, exactly as in dyn-fair. One shared atomic class carrying
// `var(--hash-translateX, …)`, the value on an inline style. Default-exports render(i)
// (§6); the harness loops it.
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
