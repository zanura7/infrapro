# ServerAvatar deployment — Projek Infra

Production deploys are handled by **ServerAvatar** on the Bedaie VPS. This doc walks through first-time setup. Subsequent deploys are one-click via the ServerAvatar UI (or auto-on-push if you enable webhooks).

> The Docker stack (`Dockerfile`, `docker-compose.yml`) in this repo is for **local development only** — it's not used in production.

---

## Prerequisites (on the VPS, via ServerAvatar)

ServerAvatar should already have these provisioned. If not, install via SA's UI:

- PHP 8.3 + extensions: `bcmath, exif, fileinfo, gd, intl, mbstring, mysqli, openssl, pdo_mysql, redis, zip`
- MySQL 8.x
- Redis (recommended for cache/session/queue — optional, fallback is `database` driver)
- Node.js 20+ (for the asset build step)
- Composer 2

---

## First-time setup (~15 minutes)

### 1. Add Application

ServerAvatar UI → your VPS → **Applications** → **Add Application**

| Field | Value |
|---|---|
| Application Type | **Custom** *(or Laravel — depends on your SA version)* |
| Domain Name | use the VPS IP for now (e.g. `103.179.57.123`) — switch to a real domain later |
| PHP Version | **8.3** |
| Public Folder / Web Root | `web/public` |
| Application User | leave default (e.g. `bedaie-projek`) |
| Database | tick **Create Database** — let SA generate a name + strong password |

### 2. Connect Git

Application detail → **Git** tab → **Setup Git Repository**

| Field | Value |
|---|---|
| Provider | **GitHub** |
| Repo URL | `git@github.com:zanura7/infrapro.git` |
| Branch | `main` |

ServerAvatar will show a **deploy key (public)**. Copy it, then on GitHub:
**Repo → Settings → Deploy keys → Add deploy key** → paste, leave **read-only**, save.

Back in SA, click **Verify** then **Clone Repository**.

### 3. Environment file

Application detail → **Environment** tab.

Open `.env.docker.example` from the repo (it's at `web/.env.docker.example`) for reference. The real .env lives at `<app_path>/web/.env` — SA's editor should point there. Required values:

```ini
APP_NAME="Projek Infra"
APP_ENV=production
APP_KEY=                    # leave blank — deploy.sh fills it
APP_DEBUG=false
APP_URL=http://<VPS_IP>     # change to https://domain.tld after SSL

DB_CONNECTION=mysql
DB_HOST=127.0.0.1           # ServerAvatar runs MySQL on host
DB_PORT=3306
DB_DATABASE=<from SA>       # SA fills these for you
DB_USERNAME=<from SA>
DB_PASSWORD=<from SA>

CACHE_STORE=redis           # use 'database' if Redis isn't installed
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CLIENT=phpredis

VIBER_API_KEY=gf-b37cc3d92252aebbbd620d27b2f67a6694972e3b3c1a089b
AI_BASE_URL=https://gstd.viber.id/v1
AI_TEXT_MODEL=grok-4.20-beta
AI_IMAGE_MODEL=grok-imagine-1.0
AI_VIDEO_MODEL=grok-imagine-1.0-video
```

### 4. Deployment Script

Application detail → **Deployment** tab → **Deployment Script**.

Paste:

```bash
bash web/deploy.sh
```

Save. That single line calls our checked-in script which does composer install, npm build, migrate, cache, restart workers — everything idempotent.

### 5. First deploy

Click **Deploy Now** in the Deployment tab. First run takes ~3–5 min (composer + npm download). Subsequent deploys ~30–60s.

After it finishes, hit `http://<VPS_IP>` in a browser. Login with the seeded admin:

- email: `admin@bedaie.id`
- password: `password`

**Change the admin password immediately** via Settings → Profile.

---

## Cron + queue worker

ServerAvatar UI → application → **Cron Jobs** and **Workers** tabs.

### Cron (1 entry)

```
* * * * * cd <app_path>/web && php artisan schedule:run >> /dev/null 2>&1
```

Replace `<app_path>` with whatever ServerAvatar shows (typically `/home/<user>/htdocs/<site>`).

### Queue worker (1 worker)

| Field | Value |
|---|---|
| Command | `php artisan queue:work --tries=3 --max-time=3600 --sleep=2` |
| Working Directory | `<app_path>/web` |
| User | application user (default) |
| Process count | 1 (bump later if AI calls queue up) |
| Auto-restart | yes |

Save & start the worker.

---

## Subsequent deploys

Two options:

**Manual** — push to `main` from your laptop, then in SA click **Deploy Now**. Done.

**Webhook (recommended)** — SA → Application → Deployment → enable **Auto Deploy on Push**. SA gives you a webhook URL; paste it in **GitHub repo → Settings → Webhooks → Add webhook**. From now on, every `git push` to `main` triggers a deploy.

---

## SSL (when you get a domain)

1. Point DNS A record to VPS IP
2. SA → Application → **SSL** tab → **Let's Encrypt** → enter domain → Issue
3. SA auto-renews. Update `APP_URL` in env to `https://your-domain.tld` and redeploy.

---

## Troubleshooting

**Deploy script fails on `composer install`**
SA's PHP user might not have write permission to `vendor/`. SA usually handles this; if not, run as the app user: `sudo -u <app_user> bash web/deploy.sh`.

**Deploy succeeds but page is 500**
Check `web/storage/logs/laravel.log`. Most likely:
- `.env` not saved properly (re-open Environment tab and click Save)
- `APP_KEY` blank — re-run deploy script (it generates one)
- DB credentials wrong

**`npm: command not found` during deploy**
SA didn't provision Node. Install it via SA's "Server Settings" or SSH in and `apt install nodejs npm` (or use nvm).

**`storage:link` fails**
Usually because `public/storage` already exists as a real directory (not a symlink). Delete it: `rm -rf web/public/storage`, redeploy.

**Queue worker dies repeatedly**
SA's worker UI shows logs. Common causes: Redis not running (switch `QUEUE_CONNECTION=database` and `php artisan queue:table && php artisan migrate`), or PHP memory_limit too low.

---

## Where things live on the VPS

ServerAvatar's standard layout:

```
<app_path>/                              ← repo root, ServerAvatar pulls here
├── README.md
├── plan.md
├── mockup/
├── contengen/
└── web/                                  ← Laravel app
    ├── app/, database/, ...
    ├── public/                           ← document root
    │   ├── index.php
    │   ├── build/                        ← vite output
    │   └── storage  → ../storage/app/public
    ├── storage/
    ├── vendor/                           ← composer install
    ├── node_modules/                     ← npm ci
    ├── .env                              ← managed by SA
    └── deploy.sh                         ← what SA runs
```
