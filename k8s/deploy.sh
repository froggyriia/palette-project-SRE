#!/bin/sh
# Builds images with the local Docker, loads them into minikube and applies the manifests.
set -eu
cd "$(dirname "$0")/.."

docker build -t palette-backend:1.1 ./backend
docker build -t palette-frontend:1.0 ./frontend
minikube image load palette-backend:1.1
minikube image load palette-frontend:1.0

# The migration Job is immutable: recreate it to run migrations with the new image.
kubectl delete job migrate --ignore-not-found
kubectl apply -f k8s/
