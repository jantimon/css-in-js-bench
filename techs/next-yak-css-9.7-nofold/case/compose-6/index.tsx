// bench-strategy: compose-depth
// next-yak (css prop) — compose-6, the depth-sweep upper bracket: the compose-3
// fragment chain extended three more levels (L3–L5), each adding one small
// border-left/padding-left declaration and interpolating the previous fragment (this
// lane's composition idiom — see tabs/multifile). Default-exports a single-instance
// render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

const l0 = css`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const l1 = css`${l0};border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const l2 = css`${l1};border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;
const l3 = css`${l2};border-left:3px solid hsl(159 70% 50%);padding-left:6px;`;
const l4 = css`${l3};border-left:4px solid hsl(212 70% 50%);padding-left:8px;`;
const l5 = css`${l4};border-left:5px solid hsl(265 70% 50%);padding-left:10px;`;

const ComposedButton: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
  <button css={css`${l5}`}>{children}</button>
);

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
