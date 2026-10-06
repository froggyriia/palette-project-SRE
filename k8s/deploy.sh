#!/bin/sh
# Builds images inside minikube's Docker daemon and applies the manifests.
set -eu
cd "$(dirname "$0")/.."

eval "$(minikube docker-env)"
docker build -t palette-backend:1.0 ./backend
docker build -t palette-frontend:1.0 ./frontend

kubectl apply -f k8s/
