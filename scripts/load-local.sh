#!/usr/bin/env bash
# Make local images available to a local cluster: ./scripts/load-local.sh kind|minikube
set -euo pipefail
cd "$(dirname "$0")/.."
for dir in services/*/; do
  svc=$(basename "$dir")
  case "${1:-kind}" in
    kind) kind load docker-image "microshop/$svc:1.0.0" ;;
    minikube) minikube image load "microshop/$svc:1.0.0" ;;
  esac
done
