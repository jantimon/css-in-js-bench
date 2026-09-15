import { styled, css } from "@yak/solid";
import type { JSX } from "@solidjs/web";

interface P {
  $active?: boolean;
  $fullWidth?: boolean;
  $variant?: 'primary' | 'secondary' | 'ghost';
  children?: JSX.Element;
}

const Button = styled.button<P>`
  display:inline-flex;align-items:center;justify-content:center;border-radius:6px;padding:8px 16px;font-size:14px;line-height:20px;font-weight:500;background-color:#2563eb;color:#ffffff;
  ${(p) => !p.$active && css`background-color:#d1d5db;color:#6b7280;`}
  ${(p) => p.$variant === 'secondary' && css`background-color:#f3f4f6;color:#111827;`}
  ${(p) => p.$variant === 'ghost' && css`background-color:transparent;color:#2563eb;`}
  ${(p) => p.$fullWidth && css`width:100%;`}
`;

export default (i: () => number) => {
  const variant = () => (['primary', 'secondary', 'ghost'] as const)[i() % 3];
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
