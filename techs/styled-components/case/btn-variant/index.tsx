// styled-components — btn-variant. Identical CSS to every other lane; the
// difference is the runtime: styled-components resolves these prop-driven rules
// and injects CSS at render. Default-exports a single-instance render(i) (§6);
// the harness loops it. btn-variant varies active/fullWidth/variant by index.
import React from 'react';
import { styled, css } from 'styled-components';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const Button = styled.button<P>`
  display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:8px 16px;font-size:14px;line-height:20px;font-weight:500;background-color:#2563eb;color:#ffffff;
  ${(p) => !p.$active && 'background-color:#d1d5db;color:#6b7280;'}
  ${(p) => p.$variant === 'secondary' && 'background-color:#f3f4f6;color:#111827;'}
  ${(p) => p.$variant === 'ghost' && 'background-color:transparent;color:#2563eb;'}
  ${(p) => p.$fullWidth && 'width:100%;'}
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
