#!/usr/bin/env bash
# Prepares the deployment strategies environment in the running minikube:
#   1. builds the backend image palette-backend:1.1 and loads it into minikube
#   2. installs Envoy Gateway (with the Gateway API CRDs)
#   3. creates the namespace deploy-demo (config, secret) and Gateway eg
# The main application (namespace default) must already run: the backend
# copies use its PostgreSQL. SKIP_BUILD=1 skips step 1.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
ENVOY_GATEWAY_VERSION="${ENVOY_GATEWAY_VERSION:-v1.10.0}"

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

for bin in kubectl minikube docker curl; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$bin not found" >&2; exit 1; }
done
kubectl get pod db-0 -n default >/dev/null 2>&1 || {
  echo "Pod db-0 not found in namespace default: start the main application first (k8s/deploy.sh)." >&2
  exit 1
}

if [ -z "${SKIP_BUILD:-}" ]; then
  step "Building palette-backend:1.1 and loading it into minikube"
  docker build -t palette-backend:1.1 "$REPO_ROOT/backend"
  minikube image load palette-backend:1.1
fi

step "Installing Envoy Gateway $ENVOY_GATEWAY_VERSION"
kubectl apply --server-side -f \
  "https://github.com/envoyproxy/gateway/releases/download/${ENVOY_GATEWAY_VERSION}/install.yaml"
kubectl wait --timeout=5m -n "$EG_NS" deployment/envoy-gateway --for=condition=Available

step "Namespace $NS and Gateway eg"
kubectl apply -f "$HERE/00-namespace.yaml"
kubectl apply -f "$HERE/01-gateway.yaml"
kubectl wait --timeout=3m -n "$NS" gateway/eg --for=condition=Accepted

step "Waiting for the Envoy proxy of Gateway eg"
for i in $(seq 1 60); do
  kubectl get deploy -n "$EG_NS" -l gateway.envoyproxy.io/owning-gateway-name=eg -o name 2>/dev/null | grep -q . && break
  sleep 2
done
kubectl wait --timeout=3m -n "$EG_NS" deploy -l gateway.envoyproxy.io/owning-gateway-name=eg --for=condition=Available
kubectl get pods -n "$EG_NS"

cat <<'TXT'

Ready. Next:
  ./traffic.sh <strategy>    # terminal 1: live traffic through the Gateway
  ./run.sh <strategy>        # terminal 2: the strategy step by step
  strategies: rolling | blue-green | canary | ab | shadow
TXT
