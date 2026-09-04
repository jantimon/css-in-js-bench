import { css, styled } from "@yak/solid";

// Port of a real-project DenseButton: composed css fragments, responsive
// media query, :hover/:focus-visible/:active/:disabled pseudo-states, a
// ::before WCAG min-target-size pseudo-element, a $variant conditional, and a
// child styled component with its own dynamic prop. yak compiles ALL of
// this to build-time CSS; at runtime it only flips a class for $variant.
const desktop = "@media (min-width: 992px)";

const StyledButton = styled.button<{ $variant: "standard" | "primary" }>`
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
  ${({ $variant }) =>
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

const IconContainer = styled.span<{ $hasChildren: boolean }>`
  display: flex;
  align-items: center;
  min-height: 24px;
  ${desktop} {
    min-height: 20px;
  }
  ${({ $hasChildren }) => $hasChildren && css`margin-right: 12px;`}
`;

const Icon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor" />
  </svg>
);

export default (i: () => number) => {
  const variant = () => (i() % 2 ? "primary" : "standard") as "primary" | "standard";
  const disabled = () => i() % 5 === 0;
  const hasIcon = () => i() % 2 === 0;
  return (
    <StyledButton $variant={variant()} disabled={disabled()}>
      {hasIcon() && (
        <IconContainer aria-hidden="true" $hasChildren>
          <Icon />
        </IconContainer>
      )}
      Buy {i()}
    </StyledButton>
  );
};
