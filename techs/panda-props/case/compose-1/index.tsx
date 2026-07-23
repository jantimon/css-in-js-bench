// bench-strategy: compose-depth
// Panda (style props) — compose-1, the depth-sweep control: one <styled.button>
// carrying only the compose-3 base-level styles as literal style props (this lane's
// native idiom), no wrapper chain and no merge. Default-exports a single-instance
// render(i) (§6); the harness loops it.
import React from 'react';
import { styled } from 'styled-system/jsx';

const ComposedButton = ({ children }: { children?: React.ReactNode }) => (
  <styled.button
    display="inline-flex"
    alignItems="center"
    borderRadius="6px"
    padding="8px 16px"
    background="#2563eb"
    color="#fff"
  >{children}</styled.button>
);

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
