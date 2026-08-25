import React from "react";

// Map a lane dirname to its technology logo (mirrored into assets/logos/ by report.tsx).
// All next-yak* lanes share the yak mark; tailwind-merge and cnfast share the Tailwind mark;
// the three Panda lanes share the Panda mark. Anything unmapped renders label-only.
export function logoFor(tech: string): string | null {
  if (tech.startsWith("next-yak")) return "assets/logos/next-yak.avif";
  if (tech === "tailwind-merge" || tech === "cnfast") return "assets/logos/tailwind.avif";
  if (tech === "panda" || tech === "panda-props" || tech === "panda-recipe") return "assets/logos/panda.avif";
  if (tech === "bamboo") return "assets/logos/bamboo.png";
  if (tech === "stylex" || tech === "stylex-layers") return "assets/logos/stylex.avif";
  if (tech === "emotion") return "assets/logos/emotion.avif";
  if (tech === "goober") return "assets/logos/goober.avif";
  if (tech === "vanilla") return "assets/logos/vanilla.avif";
  if (tech === "styled-components") return "assets/logos/styled-components.avif";
  return null;
}

// Names a technology may go by in analysis prose → lane dirname (for logoFor). Whole-word
// matched by Prose; longest alias wins. Deliberately no bare "yak"/"styled"/"tailwind" — too
// collision-prone in running text.
export const TECH_ALIASES: Record<string, string> = {
  "styled-components": "styled-components",
  "next-yak": "next-yak",
  "tailwind-merge": "tailwind-merge",
  cnfast: "cnfast",
  stylex: "stylex",
  StyleX: "stylex",
  emotion: "emotion",
  Emotion: "emotion",
  goober: "goober",
  Goober: "goober",
  panda: "panda",
  Panda: "panda",
  bamboo: "bamboo",
  Bamboo: "bamboo",
  vanilla: "vanilla",
};

// A technology's logo (when one is mapped) followed by its label text. The <img> is decorative
// — the label carries the name — so alt is empty. Rendered inline so it drops into a bar label,
// pill, or sidebar button without breaking text-ellipsis or alignment.
export function TechLabel({ tech, label }: { tech: string; label: string }) {
  const logo = logoFor(tech);
  return (
    <>
      {logo ? <img className="tech-logo" src={logo} alt="" loading="lazy" /> : null}
      <span className="tl-text">{label}</span>
    </>
  );
}
