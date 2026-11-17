#!/usr/bin/env bash
# Continuous traffic through the Envoy Gateway to GET /version of the backend.
# Every line shows which version and which pod answered, so the effect of a
# deployment strategy is visible in real time. The output is also written to
# deploy-strategies/logs/<name>-traffic.log.
#
# Usage:
#   ./traffic.sh canary                          # log name, Ctrl-C to stop
#   AB=1 ./traffic.sh ab                         # each line: a regular user and a beta user
#   HEADER="x-user-group: beta" ./traffic.sh ab  # every request with the header
#   RATE=0.5 ./traffic.sh rolling                # pause between requests, s (default 0.2)
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

NAME="${1:-traffic}"
RATE="${RATE:-0.2}"
LOG="$LOG_DIR/${NAME}-traffic.log"

ensure_port_forward
trap 'stop_port_forward' EXIT
trap 'exit 0' INT TERM

{
  echo "# $(date '+%Y-%m-%d %H:%M:%S') traffic to $GW/version${HEADER:+ with header '$HEADER'}${AB:+ (A/B: regular and beta users)}"
  while :; do
    ts="$(date +%H:%M:%S)"
    if [ -n "${AB:-}" ]; then
      regular="$(ask_version)"
      beta="$(ask_version -H 'x-user-group: beta')"
      printf '%s | regular: %-30s | beta: %s\n' "$ts" "$regular" "$beta"
    elif [ -n "${HEADER:-}" ]; then
      printf '%s | %s\n' "$ts" "$(ask_version -H "$HEADER")"
    else
      printf '%s | %s\n' "$ts" "$(ask_version)"
    fi
    sleep "$RATE"
  done
} 2>&1 | tee -a "$LOG"
