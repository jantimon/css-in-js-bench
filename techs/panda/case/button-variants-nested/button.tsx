// @ts-nocheck
import React from "react";
import { css, cx } from "styled-system/css";

const base = css.raw({
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
  background: "oklch(54.6% 0.245 262.881)",
  color: "#fff",
});

export const Button = ({ styles, className, children }: { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode }) => (
  <button className={cx(css(base, styles), className)}>{children}</button>
);
