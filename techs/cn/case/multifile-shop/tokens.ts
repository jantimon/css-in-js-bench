// The design system's shared utility bundles — WCAG 2.5.5 tap target + keyboard focus
// ring. Pulled by the base button, so they cross a module boundary here.
export const TAP_TARGET =
  "before:content-[''] before:absolute before:inset-1/2 before:[translate:-50%_-50%] before:w-full before:h-full " +
  "[@media(hover:none)_and_(pointer:coarse)]:before:min-w-[44px] [@media(hover:none)_and_(pointer:coarse)]:before:min-h-[44px] " +
  "[@media(hover:hover)_and_(pointer:fine)]:before:min-w-[24px] [@media(hover:hover)_and_(pointer:fine)]:before:min-h-[24px]";

export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2";
