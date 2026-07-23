// bench-strategy: inline-style
// Panda (JSX style props) — the documented best practice for a value unknown at
// build time: keep the style props static (the extractor emits ONE set of atomic
// classes) and pass the per-instance transform as an inline style, Panda's
// documented answer to truly runtime values. Default-exports render(i) (§6); the
// harness loops it.
import React, { type FunctionComponent } from 'react';
import { styled } from 'styled-system/jsx';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <styled.div {...{ display: "inline-block", width: "8px", height: "8px" }} style={{ transform: `translateX(${translateX}px)` }}>{children}</styled.div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
