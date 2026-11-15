// @ts-nocheck
import React from "react";
import { styled } from "styled-system/jsx";
import { css } from "styled-system/css";

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

// Levels above hand their raw style objects down; the leaf merges the list, later
// entries winning — the same order the styled() chains resolve in.
export const Button = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => (
  <styled.button css={[base, xs]}>{children}</styled.button>
);
