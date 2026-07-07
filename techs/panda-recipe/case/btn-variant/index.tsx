import React, { type FunctionComponent } from 'react';
import { cva } from 'styled-system/css';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

const recipe = cva({
    base: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "#2563eb", color: "#ffffff" },
    variants: {
      r0: { true: { backgroundColor: "#d1d5db", color: "#6b7280" } },
      r1: { true: { backgroundColor: "#f3f4f6", color: "#111827" } },
      r2: { true: { backgroundColor: "transparent", color: "#2563eb" } },
      r3: { true: { width: "100%" } },
    },
  });

const Button: FunctionComponent<P> = (p) => (
  <button className={recipe({ r0: !p.$active, r1: p.$variant === 'secondary', r2: p.$variant === 'ghost', r3: p.$fullWidth })}>{p.children}</button>
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
