# Convenience targets for the Docker stack.
# Run via `make <target>` from web/ directory.

.PHONY: help build up down restart logs ps shell artisan tinker migrate seed fresh deploy

help:
	@echo "make build    — docker compose build app"
	@echo "make up       — docker compose up -d"
	@echo "make down     — docker compose down"
	@echo "make restart  — restart all services"
	@echo "make logs     — tail logs of all services"
	@echo "make ps       — status of all services"
	@echo "make shell    — bash into the app container"
	@echo "make artisan  — run an artisan cmd, e.g. make artisan c='migrate:status'"
	@echo "make tinker   — open tinker REPL"
	@echo "make migrate  — run migrations"
	@echo "make seed     — run seeders"
	@echo "make fresh    — drop + re-migrate + seed (destroys data!)"
	@echo "make deploy   — pull latest + rebuild + up (use on VPS)"

build:
	docker compose build app

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

shell:
	docker compose exec app bash

artisan:
	docker compose exec app php artisan $(c)

tinker:
	docker compose exec app php artisan tinker

migrate:
	docker compose exec app php artisan migrate --force

seed:
	docker compose exec app php artisan db:seed --force

fresh:
	docker compose exec app php artisan migrate:fresh --seed --force

deploy:
	bash docker/deploy.sh
