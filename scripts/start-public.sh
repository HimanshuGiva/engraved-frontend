#!/usr/bin/env bash
# Starts the local tunnel proxy + ngrok. Requires backend (8080) and frontend (3001) already running.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! curl -sf http://127.0.0.1:8080/healthz >/dev/null; then
  echo "Backend not running on :8080 — start it first: cd engraving-backend && go run ./cmd/api"
  exit 1
fi
if ! curl -sf http://127.0.0.1:3001/ >/dev/null; then
  echo "Frontend not running on :3001 — start it first: npm run dev"
  exit 1
fi

echo "Starting tunnel proxy on :4000..."
npm run tunnel &
PROXY_PID=$!
sleep 1

cleanup() {
  kill "$PROXY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting ngrok (https://hatbox-phonics-tripod.ngrok-free.dev)..."
ngrok start app
