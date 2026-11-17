#!/usr/bin/env bash
# Runs one deployment strategy step by step and records what happens.
#
#   ./run.sh rolling | blue-green | canary | ab | shadow
#
# Before every step the script waits for Enter (AUTO=1: waits PAUSE seconds,
# default 20), prints and runs the kubectl command, then shows the pods with
# their versions, the HTTPRoute rules and how 100 sample requests through the
# Gateway were split between the versions. Everything also goes to
# deploy-strategies/logs/<strategy>-steps.log.
#
# Run ./traffic.sh <strategy> in a second terminal for live traffic.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

STRATEGY="${1:-}"
PAUSE="${PAUSE:-20}"
LOG="$LOG_DIR/${STRATEGY}-steps.log"
S="$HERE/strategies"
APPS="-f $HERE/app/backend-v1.yaml -f $HERE/app/backend-v2.yaml"

case "$STRATEGY" in
  rolling|blue-green|canary|ab|shadow) ;;
  *) echo "usage: $0 rolling|blue-green|canary|ab|shadow" >&2; exit 1 ;;
esac

log() { printf '%s\n' "$*" | tee -a "$LOG"; }
run() { log "\$ $*"; "$@" 2>&1 | tee -a "$LOG"; }

wait_next() {
  echo
  if [ -n "${AUTO:-}" ]; then sleep "$PAUSE"; else read -r -p ">>> Enter: $1 " _; fi
  log ""
  log "=== $(date '+%H:%M:%S') $1"
}

show_pods() {
  run kubectl get pods -n "$NS" -l app=palette-backend -L version --sort-by=.metadata.creationTimestamp
}

show_route() {
  log "HTTPRoute backend:"
  kubectl get httproute backend -n "$NS" -o jsonpath='{range .spec.rules[*]}  rule:{range .matches[*]}{range .headers[*]} if {.name}={.value}{end}{end} ->{range .backendRefs[*]} {.name} (weight {.weight}){end}{range .filters[*]} + mirror to {.requestMirror.backendRef.name}{end}{"\n"}{end}' \
    2>&1 | tee -a "$LOG"
}

# 100 requests through the Gateway, split by the version that answered.
show_split() {
  sleep 3   # Envoy picks up a new HTTPRoute within a second or two
  log "100 requests through the Gateway${1:+ with header '$1'}:"
  if [ -n "${1:-}" ]; then sample 100 -H "$1"; else sample 100; fi | tee -a "$LOG"
}

# Shadow: how many mirrored requests v2 received in the last 30 s (from its logs).
show_mirrored() {
  local n
  n="$(kubectl logs -n "$NS" -l version=v2.0.0 --since=30s --tail=-1 2>/dev/null | grep -c '"path": "/version"' || true)"
  log "v2.0.0 logged $n requests to /version in the last 30 s (mirrored copies)"
}

deploy_apps() {
  run kubectl apply $APPS
  run kubectl rollout status deployment/backend-v1 -n "$NS" --timeout=120s
  run kubectl rollout status deployment/backend-v2 -n "$NS" --timeout=120s
  show_pods
}

ensure_port_forward
trap 'stop_port_forward' EXIT

log ""
log "##### $(date '+%Y-%m-%d %H:%M:%S') strategy: $STRATEGY"
log "Cleaning up the previous strategy"
"$HERE/reset.sh" 2>&1 | tee -a "$LOG"

case "$STRATEGY" in
  rolling)
    wait_next "deploy v1.0.0: Deployment backend, 4 replicas"
    run kubectl apply -f "$S/rolling/01-backend-v1.yaml"
    run kubectl rollout status deployment/backend -n "$NS" --timeout=120s
    show_pods; show_route; show_split

    wait_next "rolling update to v2.0.0 (maxSurge 1, maxUnavailable 0)"
    run kubectl apply -f "$S/rolling/02-backend-v2.yaml"
    run kubectl rollout status deployment/backend -n "$NS" --timeout=300s
    show_pods; show_split

    wait_next "rollback: kubectl rollout undo"
    run kubectl rollout undo deployment/backend -n "$NS"
    run kubectl rollout status deployment/backend -n "$NS" --timeout=300s
    show_pods; show_split
    ;;

  blue-green)
    wait_next "deploy green (v1.0.0) and blue (v2.0.0), 2 replicas each"
    deploy_apps

    wait_next "route 100% to green (v1.0.0)"
    run kubectl apply -f "$S/blue-green/httproute-green.yaml"
    show_route; show_split

    wait_next "switch 100% to blue (v2.0.0)"
    run kubectl apply -f "$S/blue-green/httproute-blue.yaml"
    show_route; show_split

    wait_next "rollback: switch 100% back to green (v1.0.0)"
    run kubectl apply -f "$S/blue-green/httproute-green.yaml"
    show_route; show_split
    ;;

  canary)
    wait_next "deploy stable (v1.0.0) and canary (v2.0.0), 2 replicas each"
    deploy_apps

    for w in 90-10 50-50 0-100; do
      wait_next "canary weights v1/v2 = ${w/-//}"
      run kubectl apply -f "$S/canary/httproute-$w.yaml"
      show_route; show_split
    done
    ;;

  ab)
    wait_next "deploy A (v1.0.0) and B (v2.0.0), 2 replicas each"
    deploy_apps

    wait_next "A/B route: header x-user-group: beta -> v2.0.0, everyone else -> v1.0.0"
    run kubectl apply -f "$S/ab/httproute-ab.yaml"
    show_route
    show_split
    show_split "x-user-group: beta"
    show_split "x-user-group: alpha"
    ;;

  shadow)
    wait_next "deploy v1.0.0 (serves users) and v2.0.0 (shadow), 2 replicas each"
    deploy_apps

    wait_next "shadow route: users -> v1.0.0, copy of every request -> v2.0.0"
    run kubectl apply -f "$S/shadow/httproute-shadow.yaml"
    show_route
    show_split
    show_mirrored
    log "Last mirrored requests in the logs of v2.0.0:"
    kubectl logs -n "$NS" -l version=v2.0.0 --since=30s --prefix 2>/dev/null | grep '"path": "/version"' | tail -5 | tee -a "$LOG" || true
    ;;
esac

log ""
log "##### $(date '+%H:%M:%S') done: $STRATEGY. Log: $LOG"
