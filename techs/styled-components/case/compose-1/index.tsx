// bench-strategy: compose-depth
// styled-components — compose-1, the depth-sweep control. ONE styled component
// carrying only the compose-3 base-level styles: no styled(styled) chain, so this is
// the floor the compose-3/compose-6 wrapper costs are measured against.
// Default-exports a single-instance render(i) (§6); the harness loops it.
import React from 'react';
import { styled } from 'styled-components';

const ComposedButton = styled.button`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;

export default (i: number) => {
  return <ComposedButton>{i}</ComposedButton>;
};
