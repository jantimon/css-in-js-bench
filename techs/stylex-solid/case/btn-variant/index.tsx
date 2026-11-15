// @ts-nocheck
import type { JSX } from '@solidjs/web';
import * as stylex from '@stylexjs/stylex';

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: JSX.Element;
}

const styles = stylex.create({
    base: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "oklch(54.6% 0.245 262.881)", color: "#ffffff" },
    r0: { backgroundColor: "oklch(87.2% 0.01 258.338)", color: "oklch(55.1% 0.027 264.364)" },
    r1: { backgroundColor: "oklch(96.7% 0.003 264.542)", color: "oklch(21% 0.034 264.665)" },
    r2: { backgroundColor: "transparent", color: "oklch(54.6% 0.245 262.881)" },
    r3: { width: "100%" },
});

const Button = (props: P) => (
  <button {...stylex.attrs(styles.base, !props.$active && styles.r0, props.$variant === 'secondary' && styles.r1, props.$variant === 'ghost' && styles.r2, props.$fullWidth && styles.r3)}>{props.children}</button>
);

export default (i: () => number) => {
  const variant = () => (['primary', 'secondary', 'ghost'] as const)[i() % 3];
  return (
    <Button
      $active={i() % 4 !== 0}
      $fullWidth={i() % 3 === 0}
      $variant={variant()}
    >
      {i()}
    </Button>
  );
};
