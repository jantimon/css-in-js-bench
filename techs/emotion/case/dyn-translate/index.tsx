// Emotion — dyn-translate. Identical CSS to every other lane; the difference is
// the runtime: Emotion resolves the per-instance transform and injects a unique
// rule at render. Default-exports a single-instance render(i) (§6); the harness
// loops it. HIGH cardinality: every i yields a distinct translateX value, so each
// instance produces a new class.
import React from 'react';
import styled from "@emotion/styled";

// `$`-prefixed props are transient (the styled-components convention this shared template
// uses); emotion forwards every prop to the DOM by default, so strip them per component.
const transient = { shouldForwardProp: (p: string) => p[0] !== "$" };

interface P {
  $translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot = styled("div", transient)<P>`
  display:inline-block;width:8px;height:8px;
  transform: translateX(${({ $translateX }: P) => $translateX}px);
`;

export default (i: number) => {
  return <TranslatedDot $translateX={i}>{i}</TranslatedDot>;
};
