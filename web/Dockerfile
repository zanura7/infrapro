# ============================================================
# Stage 1 — composer install (PHP build artifacts)
# ============================================================
FROM composer:2.9 AS composer-build

WORKDIR /app

# Copy only files needed to resolve deps (better cache reuse)
COPY composer.json composer.lock ./
COPY artisan ./
COPY app/ ./app/
COPY bootstrap/ ./bootstrap/
COPY config/ ./config/
COPY database/ ./database/
COPY routes/ ./routes/

RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader

# ============================================================
# Stage 2 — npm install + vite build (frontend assets)
# ============================================================
FROM node:22-alpine AS asset-build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
COPY --from=composer-build /app/vendor ./vendor

RUN npm run build

# ============================================================
# Stage 3 — runtime (PHP-FPM)
# ============================================================
FROM php:8.3-fpm-alpine AS runtime

# System deps for the extensions Laravel needs
RUN apk add --no-cache \
        bash \
        curl \
        git \
        icu-dev \
        libpng-dev \
        libzip-dev \
        mysql-client \
        oniguruma-dev \
        zip \
    && docker-php-ext-install \
        bcmath \
        exif \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        zip \
    && apk add --no-cache --virtual .build-deps autoconf g++ make \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Composer (for cache:clear etc. if ever needed at runtime)
COPY --from=composer:2.9 /usr/bin/composer /usr/local/bin/composer

# Opcache + recommended PHP settings
RUN { \
        echo 'opcache.enable=1'; \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=16'; \
        echo 'opcache.max_accelerated_files=20000'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.fast_shutdown=1'; \
        echo 'memory_limit=512M'; \
        echo 'upload_max_filesize=50M'; \
        echo 'post_max_size=60M'; \
        echo 'max_execution_time=300'; \
    } > /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /var/www/html

# App code with composer vendor + built assets baked in
COPY --from=composer-build --chown=www-data:www-data /app/vendor ./vendor
COPY --chown=www-data:www-data . .
COPY --from=asset-build --chown=www-data:www-data /app/public/build ./public/build

# Storage + bootstrap/cache need to be writable
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Entrypoint waits for DB, runs migrate, caches config
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
