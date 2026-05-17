# CLAUDE.md — Projek Infra

## Project Overview

AI-powered content infrastructure platform. Takes a single product definition and automates the full funnel: content strategy → AI image/video generation → multi-platform posting → ads integration.

Live at: https://infra.viber.id  
VPS: 46.250.230.201 (bare-metal Nginx + PHP-FPM, no Docker in prod)  
All code lives in `web/` — the root also has `contengen/` (deprecated Next.js prototype) and `mockup/` (static HTML references).

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 11, PHP 8.3 |
| Frontend | React 18 + TypeScript, Inertia.js v2, Vite 6 |
| Styling | Tailwind CSS 3, shadcn/ui, Radix UI, Lucide |
| Database | MySQL 8.4 (prod), SQLite (local dev) |
| Cache / Queue | Redis 7 |
| Auth | Laravel Sanctum + Breeze |
| AI | Viber proxy (OpenAI-compatible) — text: grok-4.20-beta, image: grok-imagine-1.0 |
| Storage | Local filesystem now; S3-compatible path for Phase 2 |
| CI | GitHub Actions (`.github/workflows/`) |
| Local dev | Docker Compose (`make up`) |

---

## Working Directory

All commands must run from **`web/`** unless noted otherwise.

```bash
cd web
```

---

## Dev Commands

```bash
# Frontend
npm run dev          # Vite dev server (HMR)
npm run build        # tsc + Vite production build

# Backend
php artisan serve    # Laravel dev server
php artisan queue:work  # Process async AI jobs

# Testing
vendor/bin/phpunit   # Run all tests

# Database
php artisan migrate
php artisan migrate:fresh --seed

# Docker (local full-stack)
make up              # Start all services
make down
make shell           # Enter app container
make artisan CMD=...
make fresh           # Fresh migrate + seed
```

**Always run `npm run dev` (or verify a build) before committing frontend changes.**

---

## Architecture

### Request Flow
1. User hits route → Inertia controller returns `Inertia::render('PageName', props)`
2. React page receives props as component props (no separate API call)
3. For async AI jobs: controller dispatches a Job, returns `202 + job_id`
4. Frontend polls `/studio/jobs/{id}` or `/poster/jobs/{id}` until `succeeded` or `failed`

### Key Directories
```
web/
├── app/
│   ├── Http/Controllers/   # ProductController, AiStudioController, PosterController, etc.
│   ├── Models/             # User, Product, ProductAsset, ProductVersion, ContentJob, StudioTemplate, PosterTemplate
│   ├── Jobs/               # GeneratePosterJob, GenerateSceneImageJob, GenerateSceneVideoJob, StitchScenesJob
│   └── Services/Ai/        # ViberAi.php (API client), ContentStrategy.php
├── database/migrations/
├── resources/js/
│   ├── Pages/              # Dashboard, Products/, Studio/, Poster/, Auth/, Profile/
│   ├── Layouts/            # AuthenticatedLayout.tsx, GuestLayout.tsx
│   └── Components/         # shadcn/ui base + custom components
├── routes/
│   ├── web.php             # All UI + AI routes
│   └── auth.php            # Auth routes (Breeze)
└── config/services.php     # AI model config (key, base_url, models)
```

### Models & Relations
- `User` → has many `Product`, `ContentJob`
- `Product` → has many `ProductAsset`, `ProductVersion`, `ContentJob`
- `ContentJob` → polymorphic-ish (kind enum: strategy/poster/video/salespage), stores JSON `input`/`output`
- All resources are user-scoped (`user_id` foreign key, `authorizeOwner()` check in controllers)

### AI Integration
Config in `config/services.php` → env vars `VIBER_AI_KEY`, `VIBER_AI_BASE_URL`, `VIBER_TEXT_MODEL`, `VIBER_IMAGE_MODEL`.

`ViberAi.php` methods:
- `generateStrategy(product, assets)` → returns `ContentStrategy` (5-scene breakdown)
- `generateImage(prompt, referenceUrl)` → returns image URL
- `generateVideo(imageUrl, prompt)` → returns video URL (1–3 min processing)

---

## Database

Local dev defaults to SQLite. Production uses MySQL 8.4.

To switch locally to MySQL, copy `.env.docker.example` → `.env` and update credentials.

Schema patterns:
- Soft deletes via `archived_at` (not `deleted_at`) on `products`
- JSON columns: `usp`, `brand_voice`, `narrative_shape`, `input`, `output`, `meta`
- Async job tracking: `content_jobs.status` enum → `queued → running → succeeded/failed/cancelled`

---

## Frontend Conventions

- Path alias: `@` → `resources/js/`
- Component library: shadcn/ui in `resources/js/Components/ui/`
- Styling: Tailwind utility classes + CSS variables (`--brand-*`, `--ink-*`, `--flame-*`)
- Dark mode: class-based (`dark:` prefix)
- Fonts: Inter (body), Playfair Display (display headings)
- Toasts: `sonner` library
- Forms: Inertia `useForm()` hook — do not use fetch/axios for form submissions
- Navigation: Ziggy `route()` helper for named routes

---

## Coding Rules

- **No comments** unless the WHY is non-obvious (hidden constraint, subtle invariant, workaround).
- **No extra abstractions.** Don't design for hypothetical features not in the current phase.
- **No duplicate validation.** Trust Laravel's form requests and model events.
- **User isolation is mandatory.** Every query must be scoped to `auth()->user()`. Use `authorizeOwner()` in controllers.
- **Async for AI.** Never call `ViberAi` synchronously in a controller — always dispatch a Job.
- **Inertia for UI.** All UI routes return `Inertia::render()`. JSON responses only for job-status polling endpoints.
- All code, UI text, comments, and documentation must be in **English**.

---

## Environment Variables (key ones)

```
# AI
VIBER_AI_KEY=
VIBER_AI_BASE_URL=
VIBER_TEXT_MODEL=grok-4.20-beta
VIBER_IMAGE_MODEL=grok-imagine-1.0
VIBER_VIDEO_MODEL=grok-video-1.0

# Database (prod)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=projek_infra
DB_USERNAME=
DB_PASSWORD=

# Cache / Queue (prod)
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
```

---

## Deployment

Production is **bare-metal** on VPS 46.250.230.201 at `/opt/projek-infra`. ServerAvatar UI is bypassed.

```bash
# From web/ root
git push origin main          # CI runs tests
# Then on VPS:
cd /opt/projek-infra/web
git pull
composer install --no-dev
npm ci && npm run build
php artisan migrate --force
sudo systemctl reload php8.3-fpm
```

No Docker in production. Docker Compose is for local development only.

---

## Roadmap Phases

| Phase | Status | Scope |
|---|---|---|
| 1 — MVP | In progress | Product Hub, AI Studio (strategy + poster + video), Image Poster |
| 2 — Expand | Planned | Auto Posting (social media), ElevenLabs voiceover, Remotion video |
| 3 — Ads Loop | Planned | Ads Integration, performance feedback loop |

Features marked "disabled" in the sidebar nav (Auto Posting, Ads Integration) are Phase 2/3 — do not implement early.

---

## Testing

```bash
vendor/bin/phpunit
```

CI runs on push to `main`/`dev` and on PRs (`.github/workflows/tests.yml`). Tests use SQLite in-memory.

Write feature tests for new controllers. Unit tests for Services (especially `ViberAi`). Do not mock the database in feature tests.
