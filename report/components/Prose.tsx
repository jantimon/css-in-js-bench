import React from "react";
import { TECH_ALIASES, logoFor } from "./TechLabel.tsx";

// Whole-word matcher over the prose tech aliases, longest-first so "tailwind-merge" wins
// over any shorter overlap. Word chars and "-" count as word body; a match must not touch
// either kind on its flanks.
const ALIAS_RE = new RegExp(
  `(?<![\\w-])(${Object.keys(TECH_ALIASES)
    .sort((a, b) => b.length - a.length)
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?![\\w-])`,
  "g",
);

// A tech name mentioned in running prose: its logo + the name as written.
function TechToken({ name }: { name: string }) {
  const logo = logoFor(TECH_ALIASES[name]);
  return (
    <span className="prose-tech">
      {logo ? <img className="tech-logo" src={logo} alt="" loading="lazy" /> : null}
      {name}
    </span>
  );
}

// Plain prose with known technology names upgraded to logo'd tokens.
function TechText({ text }: { text: string }) {
  const parts = text.split(ALIAS_RE);
  return (
    <>
      {parts.map((seg, i) => (i % 2 === 0 ? <React.Fragment key={i}>{seg}</React.Fragment> : <TechToken name={seg} key={i} />))}
    </>
  );
}

// Renders analysis prose with backtick-escaped inline tokens. The split happens HERE, at the
// JSX level — never as a search-replace on the serialized HTML, which would corrupt entity
// escaping. A backticked token that exactly matches a known case id becomes a deep link to that
// case's section anchor (id set on the <details> by report.tsx); a token or plain-text word
// matching a technology alias gets its logo; any other backticked token renders as subtle
// monospace (`.mono`, not the loud code pill); remaining plain text passes through.
export function Prose({ text, caseIds }: { text: string; caseIds: string[] }) {
  const known = new Set(caseIds);
  // Odd-indexed segments are the text captured between a backtick pair.
  const parts = text.split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((seg, i) =>
        i % 2 === 0 ? (
          <TechText text={seg} key={i} />
        ) : known.has(seg) ? (
          <a className="mono" href={`#${seg}`} key={i}>
            {seg}
          </a>
        ) : TECH_ALIASES[seg] ? (
          <TechToken name={seg} key={i} />
        ) : (
          <code className="mono" key={i}>
            {seg}
          </code>
        ),
      )}
    </>
  );
}
