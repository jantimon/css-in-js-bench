import React from "react";
import { style } from "../../zyzz.config";

// Levels above pass their classes down as a `className` override. Ordered output lets
// an override from a consuming module win over this module's declarations.
export const Button = (props: { className?: string | undefined; children?: React.ReactNode }) => (
  <button {...styles.base({ className: props.className })}>{props.children}</button>
);

namespace styles {
  export const base = style({
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
    fontWeight: 600,
    lineHeight: "20px",
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
  });
}
