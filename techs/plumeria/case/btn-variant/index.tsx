// Plumeria — the variant/state button. Every branch is a `classStyle` array entry and
// the compiler resolves the whole ladder at build time: right-wins, so the ghost/
// secondary overrides beat the base and the inactive layer, and the element ships one
// flat class list with no runtime merge. Default-exports a single-instance render(i)
// (§6); the harness loops it.
import React, { type FunctionComponent } from "react";
import * as css from "@plumeria/core";

const styles = css.create({
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: "20px",
    color: "#ffffff",
    backgroundColor: "oklch(54.6% 0.245 262.881)",
    borderRadius: 6
  },
  inactive: {
    color: "oklch(55.1% 0.027 264.364)",
    backgroundColor: "oklch(87.2% 0.01 258.338)"
  },
  secondary: {
    color: "oklch(21% 0.034 264.665)",
    backgroundColor: "oklch(96.7% 0.003 264.542)"
  },
  ghost: {
    color: "oklch(54.6% 0.245 262.881)",
    backgroundColor: "transparent"
  },
  full: {
    width: "100%"
  },
});

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
}

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => (
  <button
    classStyle={[
      styles.btn,
      !$active && styles.inactive,
      $variant === "secondary" && styles.secondary,
      $variant === "ghost" && styles.ghost,
      $fullWidth && styles.full,
    ]}
  >
    {children}
  </button>
);

export default (i: number) => {
  const variant = (["primary", "secondary", "ghost"] as const)[i % 3];
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
