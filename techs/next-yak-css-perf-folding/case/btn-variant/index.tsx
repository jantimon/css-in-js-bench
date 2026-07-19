/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const Button: React.FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <button css={css`
      display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:8px 16px;font-size:14px;line-height:20px;font-weight:500;background-color:#2563eb;color:#ffffff;
      ${() => !$active && css`background-color:#d1d5db;color:#6b7280;`}
      ${() => $variant === 'secondary' && css`background-color:#f3f4f6;color:#111827;`}
      ${() => $variant === 'ghost' && css`background-color:transparent;color:#2563eb;`}
      ${() => $fullWidth && css`width:100%;`}
    `}>{children}</button>
);

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
