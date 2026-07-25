// @ts-nocheck
import React, { type FunctionComponent } from 'react';
import * as stylex from '@stylexjs/stylex';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const styles = stylex.create({
    base: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "#2563eb", color: "#ffffff" },
    r0: { backgroundColor: "#d1d5db", color: "#6b7280" },
    r1: { backgroundColor: "#f3f4f6", color: "#111827" },
    r2: { backgroundColor: "transparent", color: "#2563eb" },
    r3: { width: "100%" },
});

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <button {...stylex.props(styles.base, !$active && styles.r0, $variant === 'secondary' && styles.r1, $variant === 'ghost' && styles.r2, $fullWidth && styles.r3)}>{children}</button>
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
