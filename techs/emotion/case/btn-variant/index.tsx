// Emotion — btn-variant. Identical CSS to every other lane; the difference is the
// runtime: Emotion resolves these prop-driven rules and injects CSS at render.
// Default-exports a single-instance render(i) (§6); the harness loops it.
// btn-variant varies active/fullWidth/variant by index.
import React from 'react';
import styled from "@emotion/styled";

// `$`-prefixed props are transient (the styled-components convention this shared template
// uses); emotion forwards every prop to the DOM by default, so strip them per component.
const transient = { shouldForwardProp: (p: string) => p[0] !== "$" };

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const Button = styled("button", transient)<P>`
  display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:8px 16px;font-size:14px;line-height:20px;font-weight:500;background-color:#2563eb;color:#ffffff;
  ${(p: P) => !p.$active && 'background-color:#d1d5db;color:#6b7280;'}
  ${(p: P) => p.$variant === 'secondary' && 'background-color:#f3f4f6;color:#111827;'}
  ${(p: P) => p.$variant === 'ghost' && 'background-color:transparent;color:#2563eb;'}
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
