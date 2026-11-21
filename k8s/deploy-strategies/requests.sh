#!/usr/bin/env bash
# Compact view of the requests that reach the backend pods, from their logs:
#   12:30:01 | v1.0.0 | backend-v1-7d9c-x2k4f | GET /version 200
#   12:30:01 | v2.0.0 | backend-v2-5b8f-m9q1c | GET /version 200  <- mirror copy
# In the Shadow strategy every user request appears twice: once on v1 (its
# response goes to the user) and once on v2 (the mirrored copy, its response is
# discarded by Envoy). Also written to deploy-strategies/logs/<name>-requests.log.
#
# Start it after the pods are deployed (kubectl logs follows the pods that
# exist at start):
#   ./requests.sh shadow
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

NAME="${1:-requests}"
LOG="$LOG_DIR/${NAME}-requests.log"
MARK_V2=""
if [ "$NAME" = "shadow" ]; then MARK_V2="  <- mirror copy"; fi

echo "# $(date '+%Y-%m-%d %H:%M:%S') requests in the logs of the backend pods (namespace $NS)" | tee -a "$LOG"
kubectl logs -n "$NS" -l app=palette-backend -f --prefix --since=1s --max-log-requests=10 2>/dev/null |
  awk -v mark="$MARK_V2" '
    function str(k,   r) { if (match($0, "\"" k "\": \"[^\"]*\"")) { r = substr($0, RSTART, RLENGTH); sub(/^"[^"]*": "/, "", r); sub(/"$/, "", r); return r } return "-" }
    function num(k,   r) { if (match($0, "\"" k "\": [0-9]+")) { r = substr($0, RSTART, RLENGTH); sub(/^"[^"]*": /, "", r); return r } return "-" }
    /"request completed"/ {
      pod = $0; sub(/^\[pod\//, "", pod); sub(/\/.*/, "", pod)
      v = str("version")
      printf "%s | %-28s | %s %s %s%s\n", v, pod, str("method"), str("path"), num("status"), (v == "v2.0.0" ? mark : "")
      fflush()
    }' |
  while IFS= read -r line; do printf '%s | %s\n' "$(date +%H:%M:%S)" "$line"; done |
  tee -a "$LOG"
