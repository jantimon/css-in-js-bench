// bench-strategy: compose-depth
// next-yak (css prop) — compose-3 as a REAL 3-level component chain, matching every other lane's authored input: 3 React
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
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
