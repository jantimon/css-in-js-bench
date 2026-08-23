// Bamboo — every variant is its own STATIC css() call (the compiler rejects
// conditional objects inside one css() call as open runtime styling); the finite
// selection happens at the call site through cx(), which after compilation joins
// precompiled class-string literals.
import React, { type FunctionComponent } from 'react';
import { css, cx } from 'styled-system/css';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const base = css({ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "#2563eb", color: "#ffffff" });
const inactive = css({ backgroundColor: "#d1d5db", color: "#6b7280" });
const secondary = css({ backgroundColor: "#f3f4f6", color: "#111827" });
const ghost = css({ backgroundColor: "transparent", color: "#2563eb" });
const fullWidth = css({ width: "100%" });

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <button className={cx(
    base,
    !$active && inactive,
    $variant === 'secondary' && secondary,
    $variant === 'ghost' && ghost,
    $fullWidth && fullWidth,
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
