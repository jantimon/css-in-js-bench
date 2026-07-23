// bench-strategy: compose-depth
// next-yak (css prop) — compose-1, the depth-sweep control: one host <button> with a
// single css`…` block carrying only the compose-3 base-level styles, no fragment
// composition. Default-exports a single-instance render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

const ComposedButton: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
  <button css={css`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`}>{children}</button>
);

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
