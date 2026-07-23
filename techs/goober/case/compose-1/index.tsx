// bench-strategy: compose-depth
// Goober — compose-1, the depth-sweep control. ONE styled component carrying only
// the compose-3 base-level styles: no styled(styled) chain. Default-exports a
// single-instance render(i) (§6); the harness loops it.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load (with shouldForwardProp so $-props don't leak to the DOM).
import React from 'react';
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

const ComposedButton = styled("button")`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;

export default (i: number) => {
  return <ComposedButton>{i}</ComposedButton>;
};
