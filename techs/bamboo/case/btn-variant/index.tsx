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

const base = css({ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "oklch(54.6% 0.245 262.881)", color: "#ffffff" });
const inactive = css({ backgroundColor: "oklch(87.2% 0.01 258.338)", color: "oklch(55.1% 0.027 264.364)" });
const secondary = css({ backgroundColor: "oklch(96.7% 0.003 264.542)", color: "oklch(21% 0.034 264.665)" });
const ghost = css({ backgroundColor: "transparent", color: "oklch(54.6% 0.245 262.881)" });
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
