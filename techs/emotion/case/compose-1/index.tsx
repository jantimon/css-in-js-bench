// bench-strategy: compose-depth
// Emotion — compose-1, the depth-sweep control. ONE styled component carrying only
// the compose-3 base-level styles: no styled(styled) chain. Default-exports a
// single-instance render(i) (§6); the harness loops it.
import React from 'react';
import styled from "@emotion/styled";

// `$`-prefixed props are transient (the styled-components convention this shared template
// uses); emotion forwards every prop to the DOM by default, so strip them per component.
const transient = { shouldForwardProp: (p: string) => p[0] !== "$" };

const ComposedButton = styled("button", transient)`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;

export default (i: number) => {
  return <ComposedButton>{i}</ComposedButton>;
};
