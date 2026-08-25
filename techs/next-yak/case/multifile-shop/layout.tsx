import { styled } from "next-yak";
import { desktop } from "./tokens";

// Structure primitives. Declarations only — no JSX use site lives in this module,
// so the fold has nothing to rewrite here and the importing page cannot fold either.

export const Grid = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  ${desktop} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
`;

export const Card = styled.li`
  display: flex;
  flex-direction: column;
  /* Each tile is its own query container, so its children adapt to the column
     width they land in — not the viewport. */
  container-type: inline-size;
  container-name: tile;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  transition: box-shadow 0.15s ease;
  @media (hover: hover) {
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ImageWrap = styled.div`
  position: relative;
  aspect-ratio: 1;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
`;

export const ImagePlaceholder = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
`;
