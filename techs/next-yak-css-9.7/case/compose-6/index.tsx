// bench-strategy: compose-depth
// next-yak (css prop) — compose-6, the depth-sweep upper bracket, as a REAL 6-level component chain, matching every other lane's authored input: 6 React
// components, each contributing its OWN declarations through an inline css prop and
// spreading the rest of its props down.
//
// Worth knowing what this costs: a css prop folds to a literal className only when there
// is no incoming className to merge. Every level here has one, so each stays a runtime
// `mergeCssProp(...)` — distributing styles across a component chain and folding are
// mutually exclusive in this API. The single-element form (compose-1) still folds.
// Default-exports a single-instance render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

interface P { children?: React.ReactNode; className?: string }

const L0: React.FunctionComponent<P> = (props) => (
  <button css={css`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`} {...props} />
);
const L1: React.FunctionComponent<P> = (props) => (
  <L0 css={css`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`} {...props} />
);
const L2: React.FunctionComponent<P> = (props) => (
  <L1 css={css`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`} {...props} />
);
const L3: React.FunctionComponent<P> = (props) => (
  <L2 css={css`border-left:3px solid hsl(159 70% 50%);padding-left:6px;`} {...props} />
);
const L4: React.FunctionComponent<P> = (props) => (
  <L3 css={css`border-left:4px solid hsl(212 70% 50%);padding-left:8px;`} {...props} />
);
const L5: React.FunctionComponent<P> = (props) => (
  <L4 css={css`border-left:5px solid hsl(265 70% 50%);padding-left:10px;`} {...props} />
);
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
