#!/usr/bin/env bash
# Records Linux screenshot baselines (the platform CI compares against) in the pinned
# Playwright image. The build and test run on a private copy of the repository inside the
# container, so the host's .next, node_modules and tsconfig.json are never touched; only
# tests/visual/visual.spec.ts-snapshots is copied back.
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.64.1-noble"
SNAPSHOTS="tests/visual/visual.spec.ts-snapshots"

docker run --rm --ipc=host -v "$PWD":/src -w /work "$IMAGE" bash -c "
  set -euo pipefail
  tar -C /src --exclude=./node_modules --exclude=./.next --exclude='./.next-*' --exclude=./test-results \
    --exclude='./playwright-report*' -cf - . | tar -xf -
  npm ci --no-audit --no-fund
  npm run test:build
  status=0
  npx playwright test --project=visual --update-snapshots=changed || status=\$?
  cp -R $SNAPSHOTS/. /src/$SNAPSHOTS/
  exit \$status
"
