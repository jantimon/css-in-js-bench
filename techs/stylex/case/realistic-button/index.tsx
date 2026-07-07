// @ts-nocheck
import React from "react";
import * as stylex from "@stylexjs/stylex";

// The same DenseButton in StyleX — identical CSS, expressed as build-time atomic
// styles with nested conditions (media / :hover / :disabled / ::before). The
// runtime cost is stylex.props merging the active atomic classes per element.
const desktop = "@media (min-width: 992px)";

const styles = stylex.create({
  base: {
    fontSize: { default: "16px", [desktop]: "14px" },
    lineHeight: { default: "24px", [desktop]: "20px" },
    letterSpacing: "0.01em",
    fontWeight: 400,
    display: { default: "flex", [desktop]: "inline-flex" },
    width: { default: "100%", [desktop]: "auto" },
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "3px",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    whiteSpace: "nowrap",
    cursor: { default: "pointer", ":disabled": "default" },
    userSelect: "none",
    paddingTop: { default: "7px", [desktop]: "1px" },
    paddingBottom: { default: "7px", [desktop]: "1px" },
    paddingLeft: { default: "15px", [desktop]: "11px" },
    paddingRight: { default: "15px", [desktop]: "11px" },
    position: "relative",
    boxShadow: { default: null, ":active:not(:disabled)": "0px 0px 2px rgba(0, 0, 0, 0.16), 0px 2px 4px rgba(0, 0, 0, 0.08)" },
    "::before": {
      content: "''",
      position: "absolute",
      inset: "50%",
      translate: "-50% -50%",
      width: "100%",
      height: "100%",
      minWidth: "24px",
      minHeight: "24px",
    },
  },
  standard: {
    color: { default: "#000", ":disabled": "rgba(0, 0, 0, 0.4)" },
    backgroundColor: {
      default: "#eee",
      ":hover:not(:active):not(:disabled)": "#ddd",
      ":focus-visible:not(:active):not(:disabled)": "#ddd",
      ":disabled": "transparent",
    },
    borderColor: { default: "rgba(0, 0, 0, 0.2)", ":disabled": "rgba(0, 0, 0, 0.1)" },
  },
  primary: {
    color: { default: "#fff", ":disabled": "rgba(0, 0, 0, 0.4)" },
    backgroundColor: {
      default: "#444",
      ":hover:not(:active):not(:disabled)": "#000",
      ":focus-visible:not(:active):not(:disabled)": "#000",
      ":disabled": "transparent",
    },
    borderColor: { default: "rgba(0, 0, 0, 0.2)", ":disabled": "rgba(0, 0, 0, 0.1)" },
  },
});

const iconStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    minHeight: { default: "24px", [desktop]: "20px" },
  },
  hasChildren: { marginRight: "12px" },
});

const Icon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor" />
  </svg>
);

export default (i: number) => {
  const variant: "standard" | "primary" = i % 2 ? "primary" : "standard";
  const disabled = i % 5 === 0;
  const hasIcon = i % 2 === 0;
  return (
    <button disabled={disabled} {...stylex.props(styles.base, variant === "primary" ? styles.primary : styles.standard)}>
      {hasIcon && (
        <span aria-hidden {...stylex.props(iconStyles.base, iconStyles.hasChildren)}>
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};
