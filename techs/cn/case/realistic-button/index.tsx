// cn — the same long Tailwind class list as the tailwind-merge lane, resolved by
// cn's cn() on EVERY render (next-yak did all of this at build time). Default-
// exports a single-instance render(i) (§6); the harness loops it. realistic-button
// varies variant/disabled/icon by index. Class strings are verbatim from the original
// cnfast lane.
import React from "react";
import { cn } from "cn";

const BASE =
  "relative flex w-full items-center justify-center text-center whitespace-nowrap cursor-pointer select-none " +
  "border border-solid rounded-[3px] text-[16px] leading-[24px] tracking-[0.01em] font-normal px-[15px] py-[7px] " +
  "min-[992px]:text-[14px] min-[992px]:leading-[20px] min-[992px]:px-[11px] min-[992px]:py-[1px] min-[992px]:inline-flex min-[992px]:w-auto " +
  "active:enabled:shadow-[0px_0px_2px_rgba(0,0,0,0.16),0px_2px_4px_rgba(0,0,0,0.08)] " +
  "before:content-[''] before:absolute before:inset-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[24px] before:min-h-[24px]";
const STANDARD = "text-black bg-[#eee] border-[rgba(0,0,0,0.2)] hover:enabled:bg-[#ddd] focus-visible:enabled:bg-[#ddd]";
const PRIMARY = "text-white bg-[#444] border-[rgba(0,0,0,0.2)] hover:enabled:bg-black focus-visible:enabled:bg-black";
const DISABLED = "text-black/40 bg-transparent border-black/10 cursor-default";

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
    <button disabled={disabled} className={cn(BASE, variant === "primary" ? PRIMARY : STANDARD, disabled && DISABLED)}>
      {hasIcon && (
        <span aria-hidden className="flex items-center min-h-[24px] min-[992px]:min-h-[20px] mr-[12px]">
          <Icon />
        </span>
      )}
      Buy {i}
    </button>
  );
};
