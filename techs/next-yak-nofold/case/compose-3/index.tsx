import React from 'react';
import { styled } from 'next-yak';

const L0 = styled.button`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const L1 = styled(L0)`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const L2 = styled(L1)`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
