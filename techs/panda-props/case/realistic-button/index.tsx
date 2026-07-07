// Panda CSS style-props (JSX factory) port of the DenseButton. Every rule is a STATIC
// object literal so `panda cssgen` extracts the CSS at build time; at runtime the
// <styled.tag> from styled-system/jsx turns the spread style props into atomic class
// names (the cost we measure). Panda 2.x style props accept only plain CSS properties —
// conditions, selectors and at-rules must go through the `css` prop, so each element
// spreads its flat props and passes the nested rules via css={...} (still static
// module consts, so cssgen can extract them). Default-exports a single-instance
// render(i) (§6).
import React from "react";
import { styled } from "styled-system/jsx";

const buttonBase = {
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
} as const;

const buttonBaseCss = {
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
} as const;

const buttonPrimary = {
  "&, &:link, &:visited": {
    color: "#fff",
    backgroundColor: "#444",
  },
  "&:hover:not(:active, :disabled), &:focus-visible:not(:active, :disabled)": {
    backgroundColor: "#000",
  },
} as const;

const buttonStandard = {
  "&, &:link, &:visited": {
    color: "#000",
    backgroundColor: "#eee",
  },
  "&:hover:not(:active, :disabled), &:focus-visible:not(:active, :disabled)": {
    backgroundColor: "#ddd",
  },
} as const;

// Precomputed per-variant css objects (base + variant keys never collide). The v2
// extractor const-folds a `cond ? A : B` css prop to a single branch when it can't
// resolve the condition — so merge statically and pick between two static ELEMENTS
// below (same pattern as the tabs case), keeping every css usage unconditional.
const buttonPrimaryCss = { ...buttonBaseCss, ...buttonPrimary } as const;
const buttonStandardCss = { ...buttonBaseCss, ...buttonStandard } as const;

const iconContainer = {
  display: "flex",
  alignItems: "center",
  minHeight: "24px",
  marginRight: "12px",
} as const;

const iconContainerCss = {
  "@media (min-width: 992px)": {
    minHeight: "20px",
  },
} as const;

const Icon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor" />
  </svg>
);

export default (i: number) => {
  const variant = i % 2 ? "primary" : "standard";
  const disabled = i % 5 === 0;
  const hasIcon = i % 2 === 0;
  const children = (
    <>
      {hasIcon && (
        <styled.span aria-hidden {...iconContainer} css={iconContainerCss}>
          <Icon />
        </styled.span>
      )}
      Buy {i}
    </>
  );
  return variant === "primary" ? (
    <styled.button disabled={disabled} {...buttonBase} css={buttonPrimaryCss}>
      {children}
    </styled.button>
  ) : (
    <styled.button disabled={disabled} {...buttonBase} css={buttonStandardCss}>
      {children}
    </styled.button>
  );
};
