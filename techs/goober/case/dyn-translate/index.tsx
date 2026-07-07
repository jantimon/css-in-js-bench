// Goober — dyn-translate. Identical CSS to every other lane; the difference is the
// runtime: Goober resolves the per-instance transform and injects a unique rule
// into a global sheet at render. Default-exports a single-instance render(i) (§6);
// the harness loops it. HIGH cardinality: every i yields a distinct translateX
// value, so each instance produces a new class.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load, mirroring the old source (with shouldForwardProp so $-props
// don't leak to the DOM).
import React from 'react';
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

interface P {
  $translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot = styled<P>("div")`
  display:inline-block;width:8px;height:8px;
  transform: translateX(${({ $translateX }: P) => $translateX}px);
`;

export default (i: number) => {
  return <TranslatedDot $translateX={i}>{i}</TranslatedDot>;
};
