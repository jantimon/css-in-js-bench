import React from "react";
import { Prose } from "./Prose.tsx";

// Renders a lane's not-compatible.md. There is no markdown parser in the report, so this
// is the subset that renders, and all an author gets: paragraphs separated by a blank
// line; a block of `- ` lines as a list; a block of `> ` lines as a quote; [text](url)
// links; and the inline tokens Prose handles — backticked case ids become links, tech
// names get their logo, other backticks turn monospace. Anything else is plain text.
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function Inline({ text, caseIds }: { text: string; caseIds: string[] }) {
  // split() with two groups yields [text, label, url, text, label, url, …, text]
  const parts = text.split(LINK);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    out.push(<Prose text={parts[i]} caseIds={caseIds} key={i} />);
    if (i + 2 < parts.length)
      out.push(
        <a href={parts[i + 2]} target="_blank" rel="noopener" key={i + 1}>
          {parts[i + 1]}
        </a>,
      );
  }
  return <>{out}</>;
}

export function Note({ text, caseIds }: { text: string; caseIds: string[] }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.slice(2)} caseIds={caseIds} />
                </li>
              ))}
            </ul>
          );
        if (lines.every((l) => l.startsWith(">")))
          return (
            <blockquote key={i}>
              <Inline text={lines.map((l) => l.replace(/^>\s?/, "")).join(" ")} caseIds={caseIds} />
            </blockquote>
          );
        return (
          <p key={i}>
            <Inline text={lines.join(" ")} caseIds={caseIds} />
          </p>
        );
      })}
    </>
  );
}
