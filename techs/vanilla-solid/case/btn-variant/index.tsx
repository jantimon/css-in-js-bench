// vanilla-solid lane — the hand-written ceiling for a variant button. Plain conditional
// class names over author-written CSS (./styles.css): no library, no runtime merge.
// Default-exports a single-instance render(i) (§6); the harness loops it. The instance
// index arrives as an accessor, so the interaction pass drives it from a signal.
import type { JSX } from "@solidjs/web";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: JSX.Element;
}

const Button = (props: P) => {
  const cls = () => {
    let c = "btn";
    if (!props.$active) c += " btnInactive";
    if (props.$variant === "secondary") c += " btnSecondary";
    if (props.$variant === "ghost") c += " btnGhost";
    if (props.$fullWidth) c += " btnFull";
    return c;
  };
  return <button class={cls()}>{props.children}</button>;
};

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
