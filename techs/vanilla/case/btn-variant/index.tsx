// vanilla lane — the hand-written ceiling for a variant button. Plain conditional class
// names over author-written CSS (./styles.css): no library, no runtime merge. Default-
// exports a single-instance render(i) (§6); the harness loops it. The per-item prop shape
// and class-assembly are verbatim from the original vanilla btn-variant lane.
import React, { type FunctionComponent } from "react";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
}

const Button: FunctionComponent<P> = ({ $active, $fullWidth, $variant, children }) => {
  let c = "btn";
  if (!$active) c += " btnInactive";
  if ($variant === "secondary") c += " btnSecondary";
  if ($variant === "ghost") c += " btnGhost";
  if ($fullWidth) c += " btnFull";
  return <button className={c}>{children}</button>;
};

export default (i: number) => {
  const variant = (["primary", "secondary", "ghost"] as const)[i % 3];
  return (
    <Button
      $active={i % 4 !== 0}
      $fullWidth={i % 3 === 0}
      $variant={variant}
    >
      {i}
    </Button>
  );
};
