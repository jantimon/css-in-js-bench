// Emotion — compose-3. Identical CSS to every other lane; the difference is the
// runtime: Emotion flattens the 3-deep styled(styled) chain and injects CSS at
// render. Default-exports a single-instance render(i) (§6); the harness loops it.
import React from 'react';
import styled from "@emotion/styled";

// `$`-prefixed props are transient (the styled-components convention this shared template
// uses); emotion forwards every prop to the DOM by default, so strip them per component.
const transient = { shouldForwardProp: (p: string) => p[0] !== "$" };

interface P { children?: React.ReactNode; }

const L0 = styled("button", transient)`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const L1 = styled(L0, transient)`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const L2 = styled(L1, transient)`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;
const ComposedButton = L2;

export default (i: number) => {
  return <ComposedButton>{i}</ComposedButton>;
};
