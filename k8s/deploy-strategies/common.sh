# shellcheck shell=bash
# Shared settings and helpers for setup.sh, traffic.sh, run.sh and reset.sh.
# Written for the bash 3.2 that ships with macOS.

NS="${NS:-deploy-demo}"
EG_NS="${EG_NS:-envoy-gateway-system}"
LOCAL_PORT="${LOCAL_PORT:-8888}"
GW="http://localhost:${LOCAL_PORT}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
LOG_DIR="$REPO_ROOT/deploy-strategies/logs"
mkdir -p "$LOG_DIR"

# 0 if something listens on the local Gateway port (any HTTP status).
gateway_reachable() {
  curl -s -o /dev/null --max-time 2 "$GW/version"
}

# Port-forward to the Envoy proxy of Gateway `eg`, unless the port is already
# forwarded (for example by traffic.sh in another terminal). On minikube the
# LoadBalancer Service of Envoy has no external IP, so port-forward is the way in.
PF_PID=""
ensure_port_forward() {
  if gateway_reachable; then return 0; fi
  local svc
  svc="$(kubectl get svc -n "$EG_NS" \
    -l gateway.envoyproxy.io/owning-gateway-name=eg,gateway.envoyproxy.io/owning-gateway-namespace="$NS" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
  if [ -z "$svc" ]; then
    echo "Envoy proxy Service for Gateway eg not found in $EG_NS. Run setup.sh first." >&2
    exit 1
  fi
  kubectl port-forward -n "$EG_NS" "svc/$svc" "${LOCAL_PORT}:80" >"$LOG_DIR/.port-forward.log" 2>&1 &
  PF_PID=$!
  local i
  for i in $(seq 1 30); do
    gateway_reachable && return 0
    sleep 0.5
  done
  echo "Port-forward to $svc did not start, see $LOG_DIR/.port-forward.log" >&2
  exit 1
}

stop_port_forward() {
  if [ -n "$PF_PID" ]; then kill "$PF_PID" 2>/dev/null || true; fi
}

# One request to GET /version through the Gateway. Extra arguments go to curl
# (e.g. -H "x-user-group: beta"). Prints "v1.0.0 backend-v1-abc12" or "HTTP 503".
ask_version() {
  local out code body
  out="$(curl -s --max-time 2 -w ' %{http_code}' "$@" "$GW/version" || true)"
  code="${out##* }"
  body="${out% *}"
  if [ "$code" = "200" ]; then
    printf '%s\n' "$body" | sed -n 's/.*"version":"\([^"]*\)","pod":"\([^"]*\)".*/\1 \2/p'
  elif [ "$code" = "000" ]; then
    echo "no-answer -"
  else
    echo "HTTP-$code -"
  fi
}

# Sends N requests and prints how many each version answered.
sample() {
  local n="$1"; shift
  local i
  for i in $(seq 1 "$n"); do ask_version "$@"; done | awk '{print $1}' | sort | uniq -c |
    awk -v n="$n" '{printf "    %-10s %4d of %d (%d%%)\n", $2, $1, n, $1 * 100 / n}'
}
