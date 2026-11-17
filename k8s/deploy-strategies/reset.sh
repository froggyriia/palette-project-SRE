#!/usr/bin/env bash
# Removes the backend Deployments, Services and the HTTPRoute of the previous
# strategy. The namespace, the Gateway and the monitoring stay in place.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

kubectl delete httproute --all -n "$NS" --ignore-not-found
kubectl delete deployment backend backend-v1 backend-v2 -n "$NS" --ignore-not-found
kubectl delete service backend backend-v1 backend-v2 -n "$NS" --ignore-not-found
kubectl wait --for=delete pod -l app=palette-backend -n "$NS" --timeout=90s 2>/dev/null || true
echo "Reset done: Gateway eg and namespace $NS are kept."
