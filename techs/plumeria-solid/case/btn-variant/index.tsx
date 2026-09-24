// Plumeria on Solid — the variant/state button. Every branch is a `classStyle` array
// entry and the compiler resolves the whole ladder at build time: right-wins, so the ghost/
// secondary overrides beat the base and the inactive layer, and the element ships one
// flat class list with no runtime merge. Default-exports a single-instance render(i)
// (§6); the harness loops it.
import type { JSX } from "@solidjs/web";
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
    backgroundColor: "#2563eb",
    borderRadius: 6
  },
  inactive: {
    color: "#6b7280",
    backgroundColor: "#d1d5db"
  },
  secondary: {
    color: "#111827",
    backgroundColor: "#f3f4f6"
  },
  ghost: {
    color: "#2563eb",
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
  children?: JSX.Element;
}

const Button = (props: P) => (
  <button
    classStyle={[
      styles.btn,
      !props.$active && styles.inactive,
      props.$variant === "secondary" && styles.secondary,
      props.$variant === "ghost" && styles.ghost,
      props.$fullWidth && styles.full,
    ]}
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
