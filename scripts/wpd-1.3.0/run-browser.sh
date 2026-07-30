#!/usr/bin/env bash
# Browser-lane sweep: for each lane, inject that lane's SSR markup+CSS into a real
# Chrome document and force a style-recalc + layout flush, recording the reconciling
# bar + exact counts with wpd 1.3.0 --breakdown. The DOM is identical across lanes
# (the repo's verify guarantees it), so the style/layout cost isolates the emitted
# CSS strategy. Needs the inject probes: run gen-inject.mjs first (see README).
#
# One measurement at a time: each record claims /tmp/wpd-gate-lock, then releases it.
# Usage: scripts/wpd-1.3.0/run-browser.sh [iterations] [lanes...]
set -euo pipefail
cd "$(dirname "$0")/../.."

ITERS="${1:-10}"; shift || true
LANES=("$@")
if [ "${#LANES[@]}" -eq 0 ]; then
  LANES=(vanilla styled-components emotion goober stylex tailwind-merge panda)
fi

WPD="node_modules/.pnpm/@jantimon+web-performance-debugger@1.3.0/node_modules/@jantimon/web-performance-debugger/dist/cli.js"
OUTDIR=".wpd-runs/browser/realistic-button"; mkdir -p "$OUTDIR"

for lane in "${LANES[@]}"; do
  [ -f ".wpd-runs/inject/$lane.mjs" ] || { echo "missing inject probe for $lane (run gen-inject.mjs)"; continue; }
  for _ in $(seq 1 120); do [ ! -d /tmp/wpd-gate-lock ] && break; sleep 5; done
  mkdir /tmp/wpd-gate-lock
  echo "=== browser breakdown · $lane (iters=$ITERS) ==="
  node "$WPD" record ".wpd-runs/inject/$lane.mjs" --bench --breakdown --iterations "$ITERS" --warmup 2 \
    --out "$OUTDIR/$lane.json" >/dev/null 2>&1 || echo "  FAILED $lane"
  rmdir /tmp/wpd-gate-lock
done
echo "browser sweep done -> $OUTDIR"
