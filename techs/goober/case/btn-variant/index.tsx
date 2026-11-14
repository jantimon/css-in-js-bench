// Goober — btn-variant. Identical CSS to every other lane; the difference is the
// runtime: Goober resolves these prop-driven rules and injects CSS into a global
// sheet at render. Default-exports a single-instance render(i) (§6); the harness
// loops it. btn-variant varies active/fullWidth/variant by index.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load, mirroring the old source (with shouldForwardProp so $-props
// don't leak to the DOM).
import React from 'react';
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const Button = styled<P>("button")`
  display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:8px 16px;font-size:14px;line-height:20px;font-weight:500;background-color:oklch(54.6% 0.245 262.881);color:#ffffff;
  ${(p: P) => !p.$active && 'background-color:oklch(87.2% 0.01 258.338);color:oklch(55.1% 0.027 264.364);'}
  ${(p: P) => p.$variant === 'secondary' && 'background-color:oklch(96.7% 0.003 264.542);color:oklch(21% 0.034 264.665);'}
  ${(p: P) => p.$variant === 'ghost' && 'background-color:transparent;color:oklch(54.6% 0.245 262.881);'}
  ${(p: P) => p.$fullWidth && 'width:100%;'}
`;

export default (i: number) => {
  const variant = (['primary', 'secondary', 'ghost'] as const)[i % 3];
  return (
    <Button
      $active={i % 4 !== 0}
      $fullWidth={i % 3 === 0}
      $variant={variant}
    >
      {i}
    </Button>
  );
};
