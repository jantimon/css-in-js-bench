import React from "react";
import type { StudyAnalysis } from "../analysis-schema.ts";
import type { TechInfo } from "../types.ts";
import { Prose } from "./Prose.tsx";
import { TechLabel } from "./TechLabel.tsx";

// Study-level "Key findings" panel rendered above the cases: the verdicts that survived
// the experiment rounds and one improvement hint per library.
export function StudyFindings({ study, techs, runSha, caseIds }: { study: StudyAnalysis; techs: Record<string, TechInfo>; runSha?: string; caseIds: string[] }) {
  const stale = runSha && study.provenance.gitSha !== runSha;
  return (
    <section className="study">
      <div className="study-head">
        <span className="study-title">Key findings</span>
        {stale ? <span className="sum-stale">stale — from run {study.provenance.gitSha.slice(0, 7)}</span> : null}
      </div>
      <p className="sum-headline"><Prose text={study.headline} caseIds={caseIds} /></p>
      {study.findings.map((f) => (
        <div className="study-finding" key={f.title}>
          <b><Prose text={f.title} caseIds={caseIds} /></b>
          <p className="sum-why"><Prose text={f.prose} caseIds={caseIds} /></p>
        </div>
      ))}
      {study.libraryHints.length ? (
        <div className="study-hints">
          <span className="study-sub">One hint per library</span>
          {study.libraryHints.map((h) => {
            const t = techs[h.tech];
            return (
              <div className="study-hint" key={h.tech}>
                <span className="sum-winner">
                  {t ? <span className="tp-line" style={{ background: t.bench.color }} /> : null}
                  <TechLabel tech={h.tech} label={t?.label ?? h.tech} />
                </span>
                <span className="study-hint-text"><Prose text={h.hint} caseIds={caseIds} /></span>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="study-foot">AI-generated summary by Claude Opus, from the measured data.</p>
    </section>
  );
}
