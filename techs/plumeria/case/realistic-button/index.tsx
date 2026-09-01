// The compiler resolves the build-time atomic styles and variant branches to literal
// class lists; variant, disabled and icon state still vary by instance.
import React from "react";
import * as css from "@plumeria/core";

const desktop = "@media (min-width: 992px)";

const styles = css.create({
  base: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "7px 15px",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: "24px",
    textAlign: "center",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    borderColor: "rgba(0, 0, 0, 0.2)",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 3,
    [desktop]: {
      display: "inline-flex",
      width: "auto",
      padding: "1px 11px",
      fontSize: 14,
      lineHeight: "20px"
    },
    ":active:not(:disabled)": {
      boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.16), 0px 2px 4px rgba(0, 0, 0, 0.08)",
    },
    "::before": {
      position: "absolute",
      inset: "50%",
      width: "100%",
      minWidth: 24,
      height: "100%",
      minHeight: 24,
      content: '""',
      translate: "-50% -50%"
    },
    ":disabled": {
      color: "rgba(0, 0, 0, 0.4)",
      cursor: "default",
      backgroundColor: "transparent",
      borderColor: "rgba(0, 0, 0, 0.1)"
    }
  },
  standard: {
    color: "#000",
    backgroundColor: "#eee",
    ":hover:not(:active, :disabled)": {
      backgroundColor: "#ddd"
    },
    ":focus-visible:not(:active, :disabled)": {
      backgroundColor: "#ddd"
    },
    ":hover:not(:active, :disabled):focus-visible": {
      backgroundColor: "#ddd"
    },
  },
  primary: {
    color: "#fff",
    backgroundColor: "#444",
    ":hover:not(:active, :disabled)": {
      backgroundColor: "#000"
    },
    ":focus-visible:not(:active, :disabled)": {
      backgroundColor: "#000"
    },
    ":hover:not(:active, :disabled):focus-visible": {
      backgroundColor: "#000"
    },
  },
  icon: {
    display: "flex",
    alignItems: "center",
    minHeight: 24,
    marginRight: 12,
    [desktop]: {
      minHeight: 20
    },
  },
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
    <button
      type="button"
      disabled={disabled}
      classStyle={[styles.base, variant === "primary" ? styles.primary : styles.standard]}
    >
      {hasIcon && (
        <span aria-hidden="true" classStyle={styles.icon}>
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};
