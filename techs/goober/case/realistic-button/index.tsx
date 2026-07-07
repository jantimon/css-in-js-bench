// Goober — the DenseButton. Identical CSS to every other lane; the difference is
// the runtime: Goober resolves these nested rules and injects CSS into a global
// sheet at render. Default-exports a single-instance render(i) (§6); the harness
// loops it. realistic-button varies variant/disabled/icon by index.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load, mirroring the old source (with shouldForwardProp so $-props
// don't leak to the DOM).
import React from "react";
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

// styled-components' `css` returns a composable fragment; Goober has no fragment
// API, so for the (static) shared fragments in the realistic templates a raw
// template concatenator inlines the CSS text — the faithful Goober equivalent.
const css = (s: TemplateStringsArray, ...v: any[]) => s.reduce((a, x, i) => a + x + (v[i] ?? ""), "");

const desktop = "@media (min-width: 992px)";

const StyledButton = styled<{ $variant: "standard" | "primary" }>("button")`
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0.01em;
  font-weight: 400;
  display: flex;
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  padding: 7px 15px;
  position: relative;
  ${desktop} {
    font-size: 14px;
    line-height: 20px;
    padding: 1px 11px;
    display: inline-flex;
    width: auto;
  }
  &:active:not(:disabled) {
    box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.16), 0px 2px 4px rgba(0, 0, 0, 0.08);
  }
  &::before {
    content: "";
    position: absolute;
    inset: 50%;
    translate: -50% -50%;
    width: 100%;
    height: 100%;
    min-width: 24px;
    min-height: 24px;
  }
  ${({ $variant }: { $variant: "standard" | "primary" }) =>
    $variant === "primary"
      ? css`
          &,
          &:link,
          &:visited {
            color: #fff;
            background-color: #444;
          }
          &:hover:not(:active, :disabled),
          &:focus-visible:not(:active, :disabled) {
            background-color: #000;
          }
        `
      : css`
          &,
          &:link,
          &:visited {
            color: #000;
            background-color: #eee;
          }
          &:hover:not(:active, :disabled),
          &:focus-visible:not(:active, :disabled) {
            background-color: #ddd;
          }
        `}
  &:disabled {
    color: rgba(0, 0, 0, 0.4);
    background-color: transparent;
    border-color: rgba(0, 0, 0, 0.1);
    cursor: default;
  }
`;

const IconContainer = styled<{ $hasChildren: boolean }>("span")`
  display: flex;
  align-items: center;
  min-height: 24px;
  ${desktop} {
    min-height: 20px;
  }
  ${({ $hasChildren }: { $hasChildren: boolean }) => $hasChildren && css`margin-right: 12px;`}
`;

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
    <StyledButton $variant={variant} disabled={disabled}>
      {hasIcon && (
        <IconContainer aria-hidden $hasChildren>
          <Icon />
        </IconContainer>
      )}
      Buy {i}
    </StyledButton>
  );
};
