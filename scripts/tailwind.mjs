// Tailwind 4 stylesheet for the utility-CSS lanes (cn, cn-solid, tailwind-merge).
//
// The lanes need the CSS for exactly the utilities they use, without preflight, so the
// input imports Tailwind's theme and utilities layers but not its base layer.
// tailwind-v3-colors.css restores v3's hex palette: the shared template is written in
// those values, and the pixel gate allows only a few levels of difference per pixel.
//
// Candidates come from Tailwind's own scanner (`@tailwindcss/oxide`), the same one the
// Vite and PostCSS integrations use. `optimize` is the Lightning CSS pass those
// integrations run on production builds; it flattens Tailwind's nested output.
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const INPUT = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "./tailwind-v3-colors.css";
`;

async function build(candidates) {
  const compiler = await compile(INPUT, { base: here, onDependency() {} });
  return optimize(compiler.build(candidates), { minify: false }).code;
}

/** CSS for the utilities that appear in rendered HTML. */
export function tailwindCssForHtml(html) {
  const scanner = new Scanner({});
  return build(scanner.scanFiles([{ content: html, extension: "html" }]));
}

/** CSS for the utilities that appear in the source files under `base` matching `pattern`. */
export function tailwindCssForSources(base, pattern) {
  const scanner = new Scanner({ sources: [{ base, pattern, negated: false }] });
  return build(scanner.scan());
}
