// Panda CSS port of the DenseButton. Every rule is a STATIC css() object literal so
// `panda cssgen` can extract the CSS at build time; at runtime css() returns only the
// atomic class names (the cost we measure). The variant/disabled conditionals choose
// between static css() objects at the call site, never injecting dynamic values.
// Default-exports a single-instance render(i) (§6).
import React from "react";
import { css, cx } from "styled-system/css";

const buttonBase = css({
  fontSize: "16px",
  lineHeight: "24px",
  letterSpacing: "0.01em",
  fontWeight: "400",
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
  "&:active:not(:disabled)": {
    boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.16), 0px 2px 4px rgba(0, 0, 0, 0.08)",
  },
  _before: {
    content: '""',
    position: "absolute",
    inset: "50%",
    translate: "-50% -50%",
    width: "100%",
    height: "100%",
    minWidth: "24px",
    minHeight: "24px",
  },
  _disabled: {
    color: "rgba(0, 0, 0, 0.4)",
    backgroundColor: "transparent",
    borderColor: "rgba(0, 0, 0, 0.1)",
    cursor: "default",
  },
});

const buttonPrimary = css({
  "&, &:link, &:visited": {
    color: "#fff",
    backgroundColor: "#444",
  },
  "&:hover:not(:active, :disabled), &:focus-visible:not(:active, :disabled)": {
    backgroundColor: "#000",
  },
});

const buttonStandard = css({
  "&, &:link, &:visited": {
    color: "#000",
    backgroundColor: "#eee",
  },
  "&:hover:not(:active, :disabled), &:focus-visible:not(:active, :disabled)": {
    backgroundColor: "#ddd",
  },
});

const iconContainer = css({
  display: "flex",
  alignItems: "center",
  minHeight: "24px",
  "@media (min-width: 992px)": {
    minHeight: "20px",
  },
  marginRight: "12px",
});

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
    <button disabled={disabled} className={cx(buttonBase, variant === "primary" ? buttonPrimary : buttonStandard)}>
      {hasIcon && (
        <span aria-hidden className={iconContainer}>
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};
