// @ts-nocheck
// Coulis — the DenseButton. Identical CSS as atomic rules (media / ::before / :active /
// :disabled). No value depends on props beyond the variant, so the class names of both
// variants are created once in the module scope and a render only picks a string.
import React from "react";
import { createStyles } from "../../coulis";

const base = createStyles({
  fontSize: { base: 16, desktop: 14 },
  lineHeight: { base: "24px", desktop: "20px" },
  letterSpacing: "0.01em",
  fontWeight: 400,
  display: { base: "flex", desktop: "inline-flex" },
  width: { base: "100%", desktop: "auto", before: "100%" },
  border: "1px solid rgba(0, 0, 0, 0.2)",
  borderRadius: 3,
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  whiteSpace: "nowrap",
  cursor: { base: "pointer", disabled: "default" },
  userSelect: "none",
  padding: { base: "7px 15px", desktop: "1px 11px" },
  position: { base: "relative", before: "absolute" },
  boxShadow: { active: "0px 0px 2px rgba(0, 0, 0, 0.16), 0px 2px 4px rgba(0, 0, 0, 0.08)" },
  borderColor: { disabled: "rgba(0, 0, 0, 0.1)" },
  content: { before: "''" },
  inset: { before: "50%" },
  translate: { before: "-50% -50%" },
  height: { before: "100%" },
  minWidth: { before: 24 },
  minHeight: { before: 24 },
});

const variant = (color: string, backgroundColor: string, hoverBackgroundColor: string) =>
  `${base} ${createStyles({
    color: { base: color, disabled: "rgba(0, 0, 0, 0.4)" },
    backgroundColor: { base: backgroundColor, hoverIdle: hoverBackgroundColor, disabled: "transparent" },
  })}`;
const standard = variant("#000", "#eee", "#ddd");
const primary = variant("#fff", "#444", "#000");

const iconContainer = createStyles({
  display: "flex",
  alignItems: "center",
  minHeight: { base: 24, desktop: 20 },
  marginRight: 12,
});

const Icon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor" />
  </svg>
);

export default (i: number) => {
  const isPrimary = i % 2 === 1;
  const disabled = i % 5 === 0;
  const hasIcon = i % 2 === 0;
  return (
    <button disabled={disabled} className={isPrimary ? primary : standard}>
      {hasIcon && (
        <span aria-hidden className={iconContainer}>
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};
