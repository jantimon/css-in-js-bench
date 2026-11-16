// Bamboo Solid — every variant is its own static style; the finite selection happens at
// the call site through cx(), which the compiler turns into a choice between precompiled
// class-string literals. The instance index arrives as an accessor, so the interaction
// pass drives it from a signal.
import type { JSX } from "@solidjs/web";
import { css, cx } from "styled-system/css";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: JSX.Element;
}

const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", padding: "8px 16px", fontSize: "14px", lineHeight: "20px", fontWeight: "500", backgroundColor: "#2563eb", color: "#ffffff" } as const;
const inactive = { backgroundColor: "#d1d5db", color: "#6b7280" } as const;
const secondary = { backgroundColor: "#f3f4f6", color: "#111827" } as const;
const ghost = { backgroundColor: "transparent", color: "#2563eb" } as const;
const fullWidth = { width: "100%" } as const;

const Button = (props: P) => (
  <button
    class={cx(
      css(base),
      !props.$active && css(inactive),
      props.$variant === "secondary" && css(secondary),
      props.$variant === "ghost" && css(ghost),
      props.$fullWidth && css(fullWidth),
    )}
  >
    {props.children}
  </button>
);

export default (i: () => number) => {
  const variant = () => (["primary", "secondary", "ghost"] as const)[i() % 3];
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
