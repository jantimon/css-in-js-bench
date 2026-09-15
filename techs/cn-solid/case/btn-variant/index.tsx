// cn-solid — a variant button whose class list is assembled from conditional utility
// fragments and concatenated by cn's cn() on EVERY render. Same class strings and the
// same per-item prop shape as the React `cn` lane, so the pair isolates the FRAMEWORK.
// Default-exports a single-instance render(i) (§6); the harness loops it. The instance
// index arrives as an accessor, so the interaction pass drives it from a signal.
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: JSX.Element;
}

const Button = (props: P) => (
  <button class={cn(
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white",
    !props.$active && "bg-gray-300 text-gray-500",
    props.$variant === "secondary" && "bg-gray-100 text-gray-900",
    props.$variant === "ghost" && "bg-transparent text-blue-600",
    props.$fullWidth && "w-full",
  )}>{props.children}</button>
);

export default (i: () => number) => {
  const variant = () => (["primary", "secondary", "ghost"] as const)[i() % 3];
  return (
    <Button
      $active={i() % 4 !== 0}
      $fullWidth={i() % 3 === 0}
      $variant={variant()}
    >
      {i()}
    </Button>
  );
};
