// @ts-nocheck
import type { JSX } from "@solidjs/web";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: "20px",
    cursor: "pointer",
    backgroundColor: "#2563eb",
    color: "#fff",
  },
});

// Levels above hand their styles down; base goes first so later levels win.
export const Button = (props: { xs?: any[]; children?: JSX.Element }) => (
  <button {...stylex.attrs(styles.base, props.xs)}>{props.children}</button>
);
