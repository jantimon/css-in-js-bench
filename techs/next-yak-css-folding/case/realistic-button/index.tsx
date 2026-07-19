/** @jsxImportSource next-yak */
import { css } from "next-yak";

// next-yak with the css PROP: every element is a host tag with css={css`…`}, so
// there is no styled() wrapper. The SWC plugin extracts all of this to build-time
// CSS; the $variant conditional becomes two closure-form branches the plugin
// resolves per render. Default-exports a single-instance render(i) (§6).
const desktop = "@media (min-width: 992px)";

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
    <button
      disabled={disabled}
      css={css`
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
        ${() =>
          variant === "primary" &&
          css`
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
          `}
        ${() =>
          variant === "standard" &&
          css`
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
      `}
    >
      {hasIcon && (
        <span
          aria-hidden
          css={css`
            display: flex;
            align-items: center;
            min-height: 24px;
            margin-right: 12px;
            ${desktop} {
              min-height: 20px;
            }
          `}
        >
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};
