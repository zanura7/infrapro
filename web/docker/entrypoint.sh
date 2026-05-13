#!/bin/sh
# Container entrypoint:
#   1. wait for MySQL to be reachable
#   2. ensure storage symlink exists
#   3. run migrations (--graceful means already-applied is OK)
#   4. cache config/route/view for prod speed
#   5. start the requested command (default: php-fpm)
set -e

echo "[entrypoint] waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
for i in $(seq 1 60); do
    if mysqladmin ping -h "${DB_HOST:-mysql}" -u"${DB_USERNAME:-projek}" -p"${DB_PASSWORD:-changeme}" --silent 2>/dev/null; then
        echo "[entrypoint] mysql up after ${i}s"
        break
    fi
    sleep 1
done

# Make sure key is set (helpful when someone copies .env.example as-is)
if ! grep -qE '^APP_KEY=base64:' /var/www/html/.env 2>/dev/null; then
    echo "[entrypoint] generating APP_KEY..."
    php artisan key:generate --force --no-interaction || true
fi

# public/storage -> storage/app/public
if [ ! -e /var/www/html/public/storage ]; then
    echo "[entrypoint] creating storage symlink..."
    php artisan storage:link --no-interaction || true
fi

# Migrations + caches — only on the FPM container, not on queue/scheduler
case "$1" in
    php-fpm)
        echo "[entrypoint] running migrations..."
        php artisan migrate --force --no-interaction --graceful || true

        if [ "${APP_ENV:-production}" = "production" ]; then
            echo "[entrypoint] caching config / routes / views..."
            php artisan config:cache  --no-interaction || true
            php artisan route:cache   --no-interaction || true
            php artisan view:cache    --no-interaction || true
        fi
        ;;
esac

echo "[entrypoint] starting: $*"
exec "$@"
