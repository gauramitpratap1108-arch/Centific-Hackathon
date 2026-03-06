#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting all services from: $ROOT_DIR"

# Backend (Node/Express)
(
  cd "$ROOT_DIR/backend"
  echo "Starting backend (http://localhost:3001)..."
  npm run dev
) &

# Frontend (Vite React)
(
  cd "$ROOT_DIR/frontend/Agent Watch"
  echo "Starting frontend (http://localhost:8080)..."
  npm run dev
) &

# AI Engine (Flask)
(
  cd "$ROOT_DIR/ai engine"
  echo "Starting AI engine (http://127.0.0.1:5001)..."
  python app.py
) &

echo "All servers are starting in the background."
echo "Press Ctrl+C to stop them (this will stop all child processes)."

wait

