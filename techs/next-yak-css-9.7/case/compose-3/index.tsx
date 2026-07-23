// bench-strategy: compose-depth
// next-yak (css prop) — compose-3. The SAME 3-level composition as the styled()
// lane, authored the css-prop way: each level is a css`…` fragment that interpolates
// the previous one (this lane's composition idiom — see tabs/multifile), and one
// host <button> carries the outermost fragment. Default-exports a single-instance
// render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

const l0 = css`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const l1 = css`${l0};border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const l2 = css`${l1};border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;

const ComposedButton: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
  <button css={css`${l2}`}>{children}</button>
);

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
