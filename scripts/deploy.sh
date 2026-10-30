#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
kubectl apply -k k8s
kubectl -n microshop wait --for=condition=available deployment --all --timeout=240s
kubectl -n microshop get pods
