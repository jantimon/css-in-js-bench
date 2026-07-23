import React from "react";
import type { CaseAnalysis } from "../analysis-schema.ts";
import { Prose } from "./Prose.tsx";

// The per-case analysis, trimmed for human readers: the one-line headline and — for the
// experiment families — the cross-case context. That's the only prose a chart can't carry;
// the full per-measurement mechanisms live in BENCHMARK.md / BENCHMARK.json (the
// agent-readable companions) and result/analysis/<caseId>.json. A gitSha mismatch against
// the current run renders a stale badge rather than dropping the text.
export function CaseSummary({ analysis, runSha, caseIds }: { analysis: CaseAnalysis; runSha?: string; caseIds: string[] }) {
  const stale = runSha && analysis.provenance.gitSha !== runSha;
  return (
    <div className="case-analysis">
      <p className="sum-headline">
        <Prose text={analysis.headline} caseIds={caseIds} />
        {stale ? <span className="sum-stale" title={`analysis from run ${analysis.provenance.gitSha.slice(0, 7)}, report is ${runSha!.slice(0, 7)}`}>stale — from run {analysis.provenance.gitSha.slice(0, 7)}</span> : null}
      </p>
      {analysis.crossCase ? <p className="sum-cross"><Prose text={analysis.crossCase} caseIds={caseIds} /></p> : null}
    </div>
  );
}
