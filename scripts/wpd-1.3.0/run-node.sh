#!/usr/bin/env bash
# Sweep the node SSR lane across every tech for one case, with wpd 1.3.0.
#
# One measurement at a time: each record acquires /tmp/wpd-gate-lock, runs, then
# releases it. Raw recordings land in .wpd-runs/<mode>/<case>/<lane>.* (gitignored);
# the committed findings read the per-package JSON these produce.
#
# Usage: scripts/wpd-1.3.0/run-node.sh <case> <cpu|alloc> [iterations] [lanes...]
set -euo pipefail
cd "$(dirname "$0")/../.."

CASE="${1:?case id, e.g. realistic-button}"
MODE="${2:?cpu | alloc}"
ITERS="${3:-250}"
shift $(( $# < 3 ? $# : 3 )) || true
LANES=("$@")
if [ "${#LANES[@]}" -eq 0 ]; then
  LANES=($(for d in techs/*/; do b=$(basename "$d"); [ -f "$d/dist/microbench/entry.mjs" ] && echo "$b"; done))
fi

# case -> instance count n (must match cases/<id>.ts; kept explicit so the node
# module needs no TS loader)
declare -A CASE_N=(
  [realistic-button]=1000 [product-grid]=400 [dyn-fair]=1000 [dyn-translate]=1000
  [btn-variant]=1000 [compose-1]=1000 [compose-3]=1000 [compose-6]=1000
  [multifile-composition]=1000 [tabs]=1000 [dyn-inline]=1000
)
N="${CASE_N[$CASE]:?unknown case $CASE - add its n}"

WPD="node_modules/.pnpm/@jantimon+web-performance-debugger@1.3.0/node_modules/@jantimon/web-performance-debugger/dist/cli.js"
ALLOC_FLAG=""; [ "$MODE" = "alloc" ] && ALLOC_FLAG="--alloc"
OUTDIR=".wpd-runs/$MODE/$CASE"; mkdir -p "$OUTDIR"

for lane in "${LANES[@]}"; do
  # gate: wait for any other measurement to finish, then claim the lock
  for _ in $(seq 1 120); do [ ! -d /tmp/wpd-gate-lock ] && break; sleep 5; done
  mkdir /tmp/wpd-gate-lock
  echo "=== $MODE · $CASE · $lane (n=$N, iters=$ITERS) ==="
  WPD_LANE="$lane" WPD_CASE="$CASE" WPD_N="$N" NODE_ENV=production \
    node "$WPD" record scripts/wpd-1.3.0/ssr-node.mjs --target node $ALLOC_FLAG \
      --iterations "$ITERS" --warmup 5 --out "$OUTDIR/$lane.json" >/dev/null 2>&1 \
    || { echo "  FAILED: $lane"; rmdir /tmp/wpd-gate-lock; continue; }
  rmdir /tmp/wpd-gate-lock
done
echo "done: $MODE $CASE -> $OUTDIR"
