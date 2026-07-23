// bench-strategy: compose-depth
// next-yak — compose-1, the depth-sweep control: ONE styled component carrying only
// the compose-3 base-level styles, no styled(styled) chain to flatten.
import React from 'react';
import { styled } from 'next-yak';

const ComposedButton = styled.button`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
