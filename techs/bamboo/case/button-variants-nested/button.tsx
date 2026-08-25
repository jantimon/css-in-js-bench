// @ts-nocheck
import React from "react";
import { css, cx } from "styled-system/css";

const base = css({
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
  background: "#2563eb",
  color: "#fff",
});

export const Button = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <button className={cx(base, className)}>{children}</button>
);
