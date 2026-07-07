import React from "react";

// A small "(i)" affordance next to a chart title. Pure CSS hover tooltip (see `.info` in
// report.tsx's CSS) so it survives in the static, script-free BENCHMARK.html — the body is
// the plain-language explanation of what the chart measures.
export function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <span className="info" tabIndex={0}>
      i<span className="tip">{children}</span>
    </span>
  );
}
