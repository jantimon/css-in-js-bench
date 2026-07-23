// bench-strategy: inline-style
// Goober — the documented best practice for a fully dynamic value: keep the styled
// template static (ONE class for all instances) and pass the per-instance transform
// as a plain inline style, so no per-value rule is hashed or injected at render.
// Default-exports render(i) (§6); the harness loops it.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load, mirroring the dyn-translate lane (with shouldForwardProp so
// $-props don't leak to the DOM).
import React from 'react';
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const Dot = styled("div")`
  display:inline-block;width:8px;height:8px;
`;

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <Dot style={{ transform: `translateX(${translateX}px)` }}>{children}</Dot>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
