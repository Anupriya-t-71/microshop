#!/usr/bin/env bash
# Builds all 25 images. Optional: REGISTRY=myuser ./scripts/build.sh  (then pushes)
set -euo pipefail
cd "$(dirname "$0")/.."
for dir in services/*/; do
  svc=$(basename "$dir")
  echo ">> building $svc"
  docker build -q -t "microshop/$svc:1.0.0" "$dir"
  if [ -n "${REGISTRY:-}" ]; then
    docker tag "microshop/$svc:1.0.0" "$REGISTRY/microshop-$svc:1.0.0"
    docker push "$REGISTRY/microshop-$svc:1.0.0"
  fi
done
echo "All images built."
