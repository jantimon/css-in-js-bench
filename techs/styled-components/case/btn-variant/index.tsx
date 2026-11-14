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
  display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:8px 16px;font-size:14px;line-height:20px;font-weight:500;background-color:oklch(54.6% 0.245 262.881);color:#ffffff;
  ${(p) => !p.$active && 'background-color:oklch(87.2% 0.01 258.338);color:oklch(55.1% 0.027 264.364);'}
  ${(p) => p.$variant === 'secondary' && 'background-color:oklch(96.7% 0.003 264.542);color:oklch(21% 0.034 264.665);'}
  ${(p) => p.$variant === 'ghost' && 'background-color:transparent;color:oklch(54.6% 0.245 262.881);'}
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
