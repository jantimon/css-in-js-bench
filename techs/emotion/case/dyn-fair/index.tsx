// bench-strategy: inline-style
// Emotion — the documented best practice for a fully dynamic value: keep the styled
// template static (ONE class for all instances) and pass the per-instance transform
// as a plain inline style, so no per-value rule is serialized or injected at render.
// Default-exports render(i) (§6); the harness loops it.
import React from 'react';
import styled from "@emotion/styled";

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const Dot = styled.div`
  display:inline-block;width:8px;height:8px;
`;

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <Dot style={{ transform: `translateX(${translateX}px)` }}>{children}</Dot>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
