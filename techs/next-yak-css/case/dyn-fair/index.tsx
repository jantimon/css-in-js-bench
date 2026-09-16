// bench-strategy: inline-style
// next-yak (css prop) — dyn-fair, for comparison only: the plain inline style over a static class that
// every other lane writes here, so the case compares like with like. This is NOT how a
// runtime value is written with yak. Its own path is a function interpolation the compiler
// turns into a CSS variable, and that is what dyn-translate measures; the gap between the
// two cases for this lane is what the CSS-variable path costs over the inline style.
// Default-exports render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <div style={{ transform: `translateX(${translateX}px)` }} css={css`
      display:inline-block;width:8px;height:8px;
    `}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
