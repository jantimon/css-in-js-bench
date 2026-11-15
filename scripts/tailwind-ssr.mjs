// Harness code for the Tailwind lanes' SSR payload, not something a project would ship.
// The snapshot and payload measurements want the CSS for exactly the classes in the
// rendered HTML, and no Tailwind integration builds from a string of markup. So this
// compiles the lane's own tailwind.css (the file the browser build feeds to
// @tailwindcss/vite) with the packages that integration uses: `@tailwindcss/oxide`
// finds the candidates in the HTML, `@tailwindcss/node` builds them and runs the same
// Lightning CSS pass as a production build.
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** CSS for the Tailwind classes in `html`, built from `<laneDir>/tailwind.css`. */
export async function tailwindCssForHtml(laneDir, html) {
  const compiler = await compile(readFileSync(join(laneDir, "tailwind.css"), "utf8"), { base: laneDir, onDependency() {} });
  const candidates = new Scanner({}).scanFiles([{ content: html, extension: "html" }]);
  return optimize(compiler.build(candidates), { minify: false }).code;
}
