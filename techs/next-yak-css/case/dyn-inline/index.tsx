// bench-strategy: inline-style
// next-yak (css prop) — control case: a fully static css prop (no interpolation, so no
// CSS variable) with the per-instance transform passed as a plain inline style. The
// delta to dyn-fair isolates what the CSS-variable path costs. Default-exports
// render(i) (§6); the harness loops it.
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
