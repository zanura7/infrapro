#!/usr/bin/env bash
# ============================================================
# Projek Infra — one-shot deploy script for the VPS.
#
# Run this from /opt/projek-infra (or wherever you cloned the repo into).
# It will:
#   1. git pull latest main
#   2. ensure web/.env exists (copy from .env.docker.example if missing)
#   3. docker compose build app
#   4. docker compose up -d
#   5. smoke-test that nginx returns 200
#
# Subsequent deploys: just run this script again.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."   # /opt/projek-infra/web

REPO_ROOT="$(cd .. && pwd)"
APP_DIR="$(pwd)"

echo "[deploy] repo: $REPO_ROOT"
echo "[deploy] app:  $APP_DIR"

# ---------- 1. pull ----------
cd "$REPO_ROOT"
echo "[deploy] git pull origin main..."
git fetch origin main
git reset --hard origin/main

# ---------- 2. env ----------
cd "$APP_DIR"
if [ ! -f .env ]; then
    echo "[deploy] no .env yet — copying from .env.docker.example"
    cp .env.docker.example .env
    echo "[deploy] !! edit .env and re-run !!"
    echo "         At minimum, set: APP_URL, DB_PASSWORD, DB_ROOT_PASSWORD, VIBER_API_KEY"
    exit 1
fi

# ---------- 3. build + up ----------
echo "[deploy] docker compose build..."
docker compose build app

echo "[deploy] docker compose up -d..."
docker compose up -d

echo "[deploy] waiting for app to settle..."
sleep 8

# ---------- 4. smoke ----------
PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2 | tr -d '"' || echo 8080)"
PORT="${PORT:-8080}"

echo "[deploy] smoke test http://127.0.0.1:${PORT}/"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" || echo "000")"
if [ "$HTTP_CODE" = "200" ]; then
    echo "[deploy] ✓ HTTP 200 — app is up."
else
    echo "[deploy] ✗ got HTTP $HTTP_CODE — check 'docker compose logs app nginx'"
    docker compose ps
    exit 1
fi

echo "[deploy] done. App listening on port ${PORT}."
echo "         Login: admin@bedaie.id / password (change this after first login!)"
