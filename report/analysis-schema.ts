// Schema for the per-case analysis files under result/analysis/<caseId>.json — written by
// an LLM agent from BENCHMARK.json (see scripts/prompts/case-analysis.md), read back by
// report.tsx and rendered as the CaseSummary block. The report treats these as data like any
// other result/ file: missing file = no summary, gitSha mismatch = rendered with a stale badge.

export type MeasurementKey =
  | "microbench"
  | "autocannon"
  | "attribution"
  | "hydrate"
  | "inp"
  | "mount"
  | "renderTiming"
  | "payload"
  | "nsweep";

export interface MeasurementAnalysis {
  /** e.g. "renders/s", "ms", "gz B", "req/s" */
  unit: string;
  higherBetter: boolean;
  /** tech dirname (data key) of the best lane */
  winner: string;
  top3: {
    tech: string;
    label: string;
    /** the reduced statistic (median), in `unit` */
    value: number;
    /** value / baseline value — raw quotient, no inversion for lower-is-better */
    ratioToBaseline: number;
  }[];
  /** the baseline lane's value (the current default next-yak lane), or null when it has no data in this case */
  baseline: { tech: string; value: number } | null;
  /** one paragraph: the mechanism behind the ordering, grounded in the WPD numbers */
  why: string;
  /** low = spreads overlap or the gap is within noise */
  confidence?: "high" | "medium" | "low";
}

export interface CaseAnalysis {
  schemaVersion: 1;
  caseId: string;
  provenance: {
    /** must equal the run's meta gitSha, else the report shows a stale badge */
    gitSha: string;
    /** the analyzed run's timestamp (report meta.timestamp) */
    runTimestamp: string;
    /** when this analysis file was written */
    generatedAt: string;
    /** model that wrote it, e.g. "claude-opus-4-…" */
    model: string;
  };
  /** one-sentence case takeaway */
  headline: string;
  measurements: Partial<Record<MeasurementKey, MeasurementAnalysis>>;
  /** optional prose linking sibling cases (tabs ↔ multifile-composition, dyn-* trio) */
  crossCase?: string;
}

/** Study-level findings rendered as the "Key findings" panel above the cases —
 * result/analysis/study.json, written by the analysis agent alongside the per-case files. */
export interface StudyAnalysis {
  schemaVersion: 1;
  provenance: CaseAnalysis["provenance"];
  /** one-sentence study takeaway */
  headline: string;
  /** the 3–6 verdicts that survived verification, mechanism-forward prose */
  findings: { title: string; prose: string }[];
  /** one-line improvement hint per library (tech dirname), from LIBRARY-HINTS.md */
  libraryHints: { tech: string; hint: string }[];
}

/** Human titles for the summary table, in report section order. */
export const MEASUREMENT_TITLES: Record<MeasurementKey, string> = {
  microbench: "SSR throughput",
  autocannon: "Load req/s",
  attribution: "SSR CPU split",
  hydrate: "Hydration",
  inp: "Interaction",
  mount: "Cold mount",
  renderTiming: "Paint/Layout",
  payload: "Page bytes",
  nsweep: "Scaling",
};
