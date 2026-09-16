// bench-strategy: css-var
// next-yak (css prop) — a function interpolation in a value position IS the css prop's
// documented path for a runtime value: the compiler turns it into a CSS variable it
// names itself and sets through the element's style on every render, so this matches
// the dyn-translate lane. Default-exports render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <div css={css`
      display:inline-block;width:8px;height:8px;
      transform: translateX(${() => translateX}px);
    `}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
