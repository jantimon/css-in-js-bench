import React, { type FunctionComponent } from 'react';
import { css } from 'styled-system/css';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <button className={css(
    { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "#2563eb", color: "#ffffff" },
    !$active && { backgroundColor: "#d1d5db", color: "#6b7280" },
    $variant === 'secondary' && { backgroundColor: "#f3f4f6", color: "#111827" },
    $variant === 'ghost' && { backgroundColor: "transparent", color: "#2563eb" },
    $fullWidth && { width: "100%" },
  )}>{children}</button>
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
