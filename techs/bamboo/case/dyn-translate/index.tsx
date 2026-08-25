// bench-strategy: inline-style
// Bamboo — the library's one dynamic path, as its author prescribes for this bench
// (jantimon/css-in-js-bench#7): the compiler rejects open runtime values inside css(),
// and Bamboo "intentionally does not handle dynamic styles", delegating runtime values
// to `style=` (or data- attributes). So the static shell compiles to one class-string
// literal and the per-instance transform rides an inline style. For Bamboo the naive
// path and the tuned dyn-fair path are the same code.
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
