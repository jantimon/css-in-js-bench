// @ts-nocheck
import React from "react";
import { createStyles } from "../../coulis";

const base = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid transparent",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: "20px",
  cursor: "pointer",
  backgroundColor: "#2563eb",
  color: "#fff",
};

// Levels above hand their style overrides down; base goes first so later levels win.
export const Button = ({ styles, children }: { styles?: object; children?: React.ReactNode }) => (
  <button className={createStyles({ ...base, ...styles })}>{children}</button>
);
