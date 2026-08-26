#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "[probe] app=$APP_DIR"
echo "[probe] node=$(node --version) npm=$(npm --version)"

test -f package-lock.json || { echo "[probe] missing package-lock.json"; exit 1; }
test -d node_modules || { echo "[probe] dependencies are not installed"; exit 1; }

echo "[probe] running 40+ engine tests"
npm test

echo "[probe] checking strict TypeScript"
npm run typecheck

echo "[probe] creating Next.js static export"
rm -rf .next out
npm run build

echo "[probe] inspecting exported artifact"
node scripts/smoke-test.mjs
node scripts/probe-e2e.mjs

echo "[probe] PASS — tests, types, build, static smoke, and e2e artifact checks succeeded"
