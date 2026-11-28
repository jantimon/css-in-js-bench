// @ts-nocheck
// Coulis — btn-variant. The props select among a finite set of looks, so the class
// names of each look are created once in the module scope (atomic class names cannot
// override each other by order: every look is its own merged style object) and a
// render only picks a string.
import React, { type FunctionComponent } from "react";
import { createStyles } from "../../coulis";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
}

const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, padding: "8px 16px", fontSize: 14, lineHeight: "20px", fontWeight: 500 };
const look = (backgroundColor: string, color: string) => ({
  fit: createStyles({ ...base, backgroundColor, color }),
  full: createStyles({ ...base, backgroundColor, color, width: "100%" }),
});
const active = look("#2563eb", "#ffffff");
const inactive = look("#d1d5db", "#6b7280");
const secondary = look("#f3f4f6", "#111827");
const ghost = look("transparent", "#2563eb");

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => {
  const classNames = $variant === "ghost" ? ghost : $variant === "secondary" ? secondary : $active ? active : inactive;
  return <button className={$fullWidth ? classNames.full : classNames.fit}>{children}</button>;
};

export default (i: number) => {
  const variant = (["primary", "secondary", "ghost"] as const)[i % 3];
  return (
    <Button $active={i % 4 !== 0} $fullWidth={i % 3 === 0} $variant={variant}>
      {i}
    </Button>
  );
};
