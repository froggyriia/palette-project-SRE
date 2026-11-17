#!/usr/bin/env bash
# Removes everything setup.sh created: the deploy-demo namespace, the
# GatewayClass and Envoy Gateway. The main application is not touched.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
ENVOY_GATEWAY_VERSION="${ENVOY_GATEWAY_VERSION:-v1.10.0}"

kubectl delete namespace "$NS" --ignore-not-found
kubectl delete -f "$HERE/01-gateway.yaml" --ignore-not-found
kubectl delete -f "https://github.com/envoyproxy/gateway/releases/download/${ENVOY_GATEWAY_VERSION}/install.yaml" \
  --ignore-not-found
