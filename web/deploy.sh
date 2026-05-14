#!/usr/bin/env bash
# ============================================================
# Projek Infra — production deploy hook for ServerAvatar.
#
# ServerAvatar pulls the repo, then runs this script (configured
# in the application's "Deployment Script" tab).
#
# This script is idempotent — safe to run on every deploy.
# It can also be run manually from the VPS:  cd /path/to/repo && bash web/deploy.sh
#
# Assumptions:
#   - cwd is the repo root (ServerAvatar default) OR the web/ folder
#   - PHP 8.3 + composer + node available on PATH (provisioned by ServerAvatar)
#   - .env already exists in web/ (created via ServerAvatar's env editor)
#   - MySQL DB already created and credentials in .env
# ============================================================
set -euo pipefail

# Resolve to web/ regardless of where the hook starts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[deploy] cwd: $(pwd)"

# ---------- 0. Pull latest (skip with SKIP_GIT_PULL=1, e.g. when ServerAvatar pulled already) ----------
if [ -z "${SKIP_GIT_PULL:-}" ] && [ -d "$SCRIPT_DIR/../.git" ]; then
    echo "[deploy] git fetch + reset to origin/main..."
    (cd "$SCRIPT_DIR/.." && git fetch origin main && git reset --hard origin/main)
fi

echo "[deploy] commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

# ---------- 1. PHP deps ----------
echo "[deploy] composer install (no-dev)..."
composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader

# ---------- 2. Node deps + asset build ----------
echo "[deploy] npm ci..."
npm ci --no-audit --no-fund

echo "[deploy] npm run build..."
npm run build

# ---------- 3. Storage symlink (idempotent) ----------
if [ ! -e public/storage ]; then
    echo "[deploy] creating storage symlink..."
    php artisan storage:link --no-interaction
fi

# ---------- 4. APP_KEY safety net ----------
if ! grep -qE '^APP_KEY=base64:' .env 2>/dev/null; then
    echo "[deploy] generating APP_KEY..."
    php artisan key:generate --force --no-interaction
fi

# ---------- 5. Migrations ----------
echo "[deploy] running migrations..."
php artisan migrate --force --no-interaction

# ---------- 6. Caches (clear first to avoid stale) ----------
echo "[deploy] clearing then caching config/route/view..."
php artisan optimize:clear --no-interaction
php artisan config:cache  --no-interaction
php artisan route:cache   --no-interaction
php artisan view:cache    --no-interaction
php artisan event:cache   --no-interaction || true

# ---------- 7. Restart queue workers ----------
# Tells running queue workers to gracefully exit so the process supervisor
# (Supervisor / Horizon / ServerAvatar's worker manager) restarts them with the new code.
echo "[deploy] queue:restart..."
php artisan queue:restart --no-interaction || true

echo "[deploy] ✓ done."
