// Build-time syntax highlighting (§10.5). One highlighter, minimal grammar set
// (tsx/html/css), one theme → the report ships zero runtime JS for highlighting;
// every <pre> is inline-styled and self-contained.
import { createHighlighter, type Highlighter } from "shiki";

export type Lang = "tsx" | "html" | "css";
export type Highlight = (code: string, lang: Lang) => string;

let hl: Highlighter | null = null;

export async function makeHighlighter(): Promise<Highlight> {
  hl ??= await createHighlighter({ themes: ["github-dark"], langs: ["tsx", "html", "css"] });
  return (code, lang) => hl!.codeToHtml(code, { lang, theme: "github-dark" });
}
