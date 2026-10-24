import React from "react";
import { style, variants } from "../../zyzz.config";

// The same DenseButton in Zyzz: build-time CSS with nested conditions (media / :active /
// :disabled / ::before) and a `variant` recipe. The compiler rewrites each call to
// precompiled props, so the runtime cost is selecting the variant's classes per element.
const Icon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor" />
  </svg>
);

export default (i: number) => {
  const variant = i % 2 ? "primary" : "standard";
  const disabled = i % 5 === 0;
  const hasIcon = i % 2 === 0;
  return (
    <button disabled={disabled} {...styles.button({ variant })}>
      {hasIcon && (
        <span aria-hidden {...styles.icon()}>
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};

namespace styles {
  export const button = variants({
    base: {
      fontSize: "16px",
      lineHeight: "24px",
      letterSpacing: "0.01em",
      fontWeight: 400,
      display: "flex",
      width: "100%",
      border: "1px solid rgba(0, 0, 0, 0.2)",
      borderRadius: "3px",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      whiteSpace: "nowrap",
      cursor: "pointer",
      userSelect: "none",
      padding: "7px 15px",
      position: "relative",
      "@media (min-width: 992px)": {
        fontSize: "14px",
        lineHeight: "20px",
        padding: "1px 11px",
        display: "inline-flex",
        width: "auto",
      },
      selectors: {
        "&:active:not(:disabled)": {
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.16), 0px 2px 4px rgba(0, 0, 0, 0.08)",
        },
      },
      "::before": {
        content: '""',
        position: "absolute",
        inset: "50%",
        translate: "-50% -50%",
        width: "100%",
        height: "100%",
        minWidth: "24px",
        minHeight: "24px",
      },
      ":disabled": {
        color: "rgba(0, 0, 0, 0.4)",
        backgroundColor: "transparent",
        borderColor: "rgba(0, 0, 0, 0.1)",
        cursor: "default",
      },
    },
    selection: "class",
    variants: {
      variant: {
        primary: {
          color: "#fff",
          backgroundColor: "#444",
          selectors: {
            "&:hover:not(:active, :disabled), &:focus-visible:not(:active, :disabled)": { backgroundColor: "#000" },
          },
        },
        standard: {
          color: "#000",
          backgroundColor: "#eee",
          selectors: {
            "&:hover:not(:active, :disabled), &:focus-visible:not(:active, :disabled)": { backgroundColor: "#ddd" },
          },
        },
      },
    },
  });

  export const icon = style({
    display: "flex",
    alignItems: "center",
    minHeight: "24px",
    marginRight: "12px",
    "@media (min-width: 992px)": { minHeight: "20px" },
  });
}
