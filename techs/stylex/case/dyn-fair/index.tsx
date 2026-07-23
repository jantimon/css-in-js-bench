// bench-strategy: dynamic-style-fn
// @ts-nocheck
// StyleX — its dynamic style function IS the documented path for runtime values
// (it compiles to a CSS variable set via an inline style), so this matches the
// dyn-translate lane. Default-exports render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from 'react';
import * as stylex from '@stylexjs/stylex';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const styles = stylex.create({
    base: { display: "inline-block", width: "8px", height: "8px" },
    dyn: (translateX: number) => ({ transform: `translateX(${translateX}px)` }),
});

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div {...stylex.props(styles.base, styles.dyn(translateX))}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
