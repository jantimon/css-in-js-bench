import React, { type FunctionComponent } from 'react';
import { styled } from 'styled-system/jsx';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
}

// Conditional styles are expressed as ternary PROP VALUES, not spread conditional objects.
// Panda extracts each branch's literal value at build time and switches the atomic class at
// runtime; a spread like `{...(cond && {...})}` is a runtime shape Panda can't read, so it's
// silently dropped. Precedence matches the original spread order (last-spread wins → ghost >
// secondary > inactive > base).
const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <styled.button
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="6px"
      padding="8px 16px"
      fontSize="14px"
      lineHeight="20px"
      fontWeight="500"
      backgroundColor={$variant === "ghost" ? "transparent" : $variant === "secondary" ? "#f3f4f6" : !$active ? "#d1d5db" : "#2563eb"}
      color={$variant === "ghost" ? "#2563eb" : $variant === "secondary" ? "#111827" : !$active ? "#6b7280" : "#ffffff"}
      width={$fullWidth ? "100%" : undefined}
  >{children}</styled.button>
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
