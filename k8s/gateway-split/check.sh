#!/usr/bin/env bash
# Sends N requests (default 200) to GET /version through the Gateway
# palette-gateway and counts how many each version answered.
# Every answer and the summary are written to gateway-split/results.log.
#
#   ./check.sh          # 200 requests
#   ./check.sh 100      # 100 requests
set -euo pipefail

N="${1:-200}"
NS=gateway-split
EG_NS=envoy-gateway-system
PORT="${PORT:-8889}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$HERE/../../gateway-split/results.log"

# Envoy proxy that Envoy Gateway started for our Gateway. On minikube its
# LoadBalancer Service has no external IP, so we reach it with port-forward.
SVC="$(kubectl get svc -n "$EG_NS" \
  -l gateway.envoyproxy.io/owning-gateway-name=palette-gateway,gateway.envoyproxy.io/owning-gateway-namespace=$NS \
  -o jsonpath='{.items[0].metadata.name}')"
kubectl port-forward -n "$EG_NS" "svc/$SVC" "$PORT:80" >/dev/null 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -s -o /dev/null "http://localhost:$PORT/version" && break
  sleep 0.5
done

{
  echo "# $(date '+%Y-%m-%d %H:%M:%S') $N requests to http://localhost:$PORT/version (Gateway palette-gateway, HTTPRoute palette-split)"
  kubectl get httproute palette-split -n "$NS" \
    -o jsonpath='# weights:{range .spec.rules[0].backendRefs[*]} {.name}={.weight}{end}{"\n"}'
  for i in $(seq 1 "$N"); do
    body="$(curl -s --max-time 2 "http://localhost:$PORT/version" || echo '{}')"
    version="$(printf '%s' "$body" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
    pod="$(printf '%s' "$body" | sed -n 's/.*"pod":"\([^"]*\)".*/\1/p')"
    printf '%3d %s %s\n' "$i" "${version:-error}" "${pod:--}"
  done
} > "$LOG.tmp"

summary="$(grep -v '^#' "$LOG.tmp" |
  awk -v n="$N" '{c[$2]++} END {for (v in c) printf "# %-8s %4d of %d (%.1f%%)\n", v, c[v], n, c[v] * 100 / n}' | sort)"
{ cat "$LOG.tmp"; echo "# result:"; echo "$summary"; echo; } >> "$LOG"
rm -f "$LOG.tmp"

echo "Result of $N requests:"
echo "$summary" | sed 's/^# /  /'
echo "Details: gateway-split/results.log"
