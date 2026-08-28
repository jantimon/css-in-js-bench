import { css } from "next-yak";

// The design system's shared style fragments. No components here — only the mixins
// the primitive modules interpolate, so the fan-out is real: `desktop` is pulled by
// layout, controls and text, and focusRing/minTargetSize by the base button.

export const desktop = "@media (min-width: 992px)";

/** Visually-hidden, still read by screen readers. */
export const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/** WCAG 2.5.5 minimum target size — grows the hit area without changing layout. */
export const minTargetSize = css`
  &::before {
    content: "";
    position: absolute;
    inset: 50%;
    translate: -50% -50%;
    width: 100%;
    height: 100%;
  }
  @media (hover: none) and (pointer: coarse) {
    &::before {
      min-width: 44px;
      min-height: 44px;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &::before {
      min-width: 24px;
      min-height: 24px;
    }
  }
`;

export const focusRing = css`
  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
`;
