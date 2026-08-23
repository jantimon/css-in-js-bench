// bench-strategy: inline-style
// Bamboo — the only expressible pattern for a value unknown at build time: keep the
// css() object static (compiled to one class-string literal) and pass the per-instance
// transform as an inline style. Bamboo rejects open runtime values at build time, so
// unlike the runtime lanes there is no naive alternative to measure against.
// Default-exports render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from 'react';
import { css } from 'styled-system/css';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div className={css({ display: "inline-block", width: "8px", height: "8px" })} style={{ transform: `translateX(${translateX}px)` }}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
