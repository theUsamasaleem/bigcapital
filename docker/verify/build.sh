#!/usr/bin/env bash
# Builds the Phase 1-3 verification server image (bigcapitalhq/server:phase3)
# as a thin overlay on the demo image, then the verify migration image.
# Never rebuilds or retags the demo's :latest images.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# 1) Compile the server (pure JS dist). Comment out if already built.
( cd packages/server && npx nest build -p tsconfig.json )

# 2) Assemble a minimal build context (dist is .dockerignored at repo root).
CTX="docker/verify/ctx"
rm -rf "$CTX"
mkdir -p "$CTX"
cp -r packages/server/dist "$CTX/dist"
cp -r packages/server/src/database "$CTX/database"
cp -r packages/server/src/i18n "$CTX/i18n"

# 3) Build the overlay server image + the verify migration image.
docker build -f docker/verify/Dockerfile.server -t bigcapitalhq/server:phase3 "$CTX"
docker build -f docker/verify/Dockerfile.migration -t finqora-verify-migration:latest .

# 4) Clean up the ephemeral context.
rm -rf "$CTX"

echo "Built bigcapitalhq/server:phase3 and finqora-verify-migration:latest"
