# Task Breakdown — Projek Infra

Granular task list. Format: `[ ]` = todo · `[~]` = in-progress · `[x]` = done · `[!]` = blocked.

Update `plan.md` when scope changes.

---

## Phase 0 — Pre-Kickoff

> **Resource status:**
> - ✅ Laravel boilerplate available from a previous project
> - ⬜ New VPS, domain, API keys, AI keys → all need to be set up

### Setup & Decisions

- [ ] **PRD lock** — finalize PRD v1.0, owner sign-off
- [ ] **Tech RFC** — write RFC: DB schema, API contract, Laravel folder structure
- [ ] **Decision: AI provider** — benchmark Claude vs GPT vs local (cost/1000 tokens, quality test)
- [ ] **Decision: Image provider** — self-host SDXL vs Replicate vs Flux API
- [ ] **Decision: TTS provider** — ElevenLabs vs Replicate vs OpenAI TTS
- [ ] **Decision: Database** — MySQL 8 or PostgreSQL 16
- [ ] **Decision: Multi/single tenant** — schema implication (tenant_id on every table?)
- [ ] **Decision: VPS provider** — IDCloudHost / Biznet / Niagahoster / DigitalOcean
- [ ] **Decision: Domain + extension** — `.com` / `.id` / `.my` / `.app`
- [ ] **Phase 1 wireframes** — Figma for Product Hub + Poster Studio + Dashboard

### Boilerplate Adaptation

- [ ] **Audit boilerplate** — list reusable features vs what to remove
- [ ] **Clone boilerplate** → new repo `projek-infra`
- [ ] **Cleanup** — remove old-project features that aren't relevant
- [ ] **Rename** — namespace, branding, .env example, README
- [ ] **Upgrade dependencies** — Laravel to 11, React/Tailwind to latest if needed
- [ ] **Verify auth & base layout** still work after cleanup

### Infra & Repo

- [ ] **Repo init** — GitHub/GitLab, branch strategy (main/dev/feature)
- [ ] **Basic CI/CD** — lint (PHP CS Fixer, ESLint), test runner, build action
- [ ] **Provision new VPS** — order, get IP, initial root access
- [ ] **VPS hardening** — UFW, fail2ban, non-root user, SSH key only
- [ ] **Install runtime on VPS** — PHP 8.3, Composer, Node 20, Nginx, MySQL/PG, Redis, Supervisor, FFmpeg (for Phase 2)
- [ ] **Purchase domain** + point A record to new VPS IP
- [ ] **Let's Encrypt SSL** — certbot + auto-renew
- [ ] **Setup deployer** — Laravel Deployer / Envoy / GH Actions SSH deploy
- [ ] **Setup staging vhost** (`staging.<domain>` subdomain) — Nginx config, .env staging
- [ ] **Setup production vhost** — Nginx config, .env production
- [ ] **Local storage** — mount separate partition at `/var/www/projek-infra/shared/storage/` (eases S3 migration later)
- [ ] **Error monitoring** — Sentry / BugSnag (free tier)
- [ ] **Uptime monitoring** — UptimeRobot / BetterStack
- [ ] **Backup strategy** — DB daily backup to another server / Drive, 7-day retention

### API Accounts (register early — reviews take time)

- [ ] **TikTok for Developers** — create app, request Marketing API access (review 1–2 weeks)
- [ ] **Meta for Developers** — create app, Business Verification, request Pages + IG posting + Marketing API
- [ ] **Google Cloud / Ads** — register Google Ads developer token (review variable)
- [ ] **AI provider key** (Claude/GPT) — create account, set spending limit
- [ ] **Image gen key** (Replicate/Flux/SDXL host)
- [ ] **TTS key** (ElevenLabs/Replicate)

---

## Phase 1 — MVP (W1–W10)

### Foundation (W1) — leverage boilerplate

- [ ] Verify Laravel version in boilerplate — upgrade to Laravel 11 if needed
- [ ] Verify Inertia.js + React + Vite scaffold present
- [ ] Verify Tailwind + shadcn/ui — install if missing
- [ ] Verify auth (Laravel Breeze/Fortify) — keep or replace
- [ ] User roles: admin, member (Spatie Permission)
- [ ] Adapt base layout (sidebar + topbar + content area) to Projek Infra branding
- [ ] Settings page skeleton

### Product Hub (W2–W4)

- [ ] Migration `products` — name, slug, category, price, description, USP, target_audience, brand_voice (JSON)
- [ ] Model `Product` + factory + seeder
- [ ] Migration `product_assets` — product_id, type (image/video/logo), path, meta
- [ ] Model `Asset` + relations
- [ ] Migration `product_versions` — track changes (simple event sourcing)
- [ ] Controller `ProductController` — index, create, show, update, destroy
- [ ] UI: product list (table with search & filter)
- [ ] UI: create/edit product form (with brand voice section)
- [ ] UI: product detail + asset library tab
- [ ] Asset upload — chunked upload to **local disk** (`storage/app/products/`), generate thumbnail. Use Laravel Filesystem disk `local` so we can swap to S3 in Phase 2.
- [ ] Asset list — grid view, filter by type, preview modal
- [ ] Versioning UI — side-by-side diff, restore version

### AI Content Studio · Poster (W5–W7)

- [ ] Service `AiProvider` (interface) + implementations (Claude, GPT)
- [ ] Service `ImageProvider` (interface) + implementation
- [ ] Job `GeneratePosterCopyJob` — LLM call with product context
- [ ] Job `GeneratePosterImageJob` — image gen call
- [ ] Job `CompositePosterJob` — overlay text + brand kit on image
- [ ] Multi-size: 1:1, 4:5, 9:16 (3 variants per request)
- [ ] Migration `content_jobs` — track status, input, output, cost
- [ ] UI: poster creator wizard (pick product → headline → variant count → generate)
- [ ] UI: realtime progress (polling or websocket)
- [ ] UI: result gallery + download / regenerate
- [ ] Export — download PNG / JPG / ZIP (if multiple)

### Dashboard & QA (W8–W10)

- [ ] Dashboard home — stat cards (total products, total content, monthly cost)
- [ ] Recent activity feed
- [ ] Empty states (onboarding wizard for first product)
- [ ] Internal QA round 1 — bug list
- [ ] Bug fix sprint
- [ ] UAT with internal team
- [ ] Phase 1 retro

---

## Phase 2 — Expand (W11–W18)

### Auto Posting (W11–W13)

- [ ] OAuth flow — TikTok login + token storage (encrypted)
- [ ] OAuth flow — Meta login (FB + IG Business)
- [ ] Migration `social_accounts` — user_id, platform, token, refresh_token, meta
- [ ] Service `Publisher` (interface) + TikTokPublisher, MetaPublisher
- [ ] Job `PublishPostJob` — execute on schedule
- [ ] UI: connect accounts (Settings → Integrations)
- [ ] Migration `scheduled_posts` — content_id, platform, scheduled_at, status, response
- [ ] UI: schedule modal (date/time picker, multi-select platforms)
- [ ] UI: calendar view (week/month) for scheduled posts
- [ ] Smart scheduling — best-time recommendation algorithm (engagement history per platform)
- [ ] Caption variants — per-platform caption (via LLM)

### AI Video (W14)

- [ ] Setup Remotion project (sub-repo or inside main)
- [ ] Install FFmpeg on server + worker
- [ ] Job `GenerateVideoScriptJob` — LLM script + scene breakdown
- [ ] Job `GenerateTTSJob` — script → audio (ElevenLabs)
- [ ] Job `AssembleVideoJob` — Remotion render with B-roll from asset library
- [ ] Auto-generate subtitles (Whisper or from script)
- [ ] Output: MP4 9:16 / 1:1 / 16:9
- [ ] UI: video creator wizard
- [ ] UI: video preview player

### AI Salespage (W15)

- [ ] HTML template engine — 3 frameworks: PAS, AIDA, BAB
- [ ] Job `GenerateSalespageCopyJob` — section-by-section copy
- [ ] Job `GenerateSalespageImagesJob` — inline image gen
- [ ] Hosting route `/{slug}` — render salespage from DB
- [ ] Migration `salespages` — slug, html, css, meta, product_id
- [ ] Mobile-first responsive check
- [ ] UI: salespage builder (pick framework → preview → publish)
- [ ] Custom domain support (later) — CNAME mapping

### Approval Workflow + Analytics (W16–W18)

- [ ] Status flow: draft → review → approved → scheduled → published
- [ ] Notification: in-app + email on review request
- [ ] Comment thread per content item
- [ ] Job `PullPostAnalyticsJob` — daily cron, per platform
- [ ] Migration `post_metrics` — post_id, views, likes, shares, comments, ctr
- [ ] UI: analytics tab per product
- [ ] Chart: time-series engagement (Recharts)
- [ ] Phase 2 UAT
- [ ] Production launch

---

## Phase 3 — Ads Loop (W19–W26)

### Ads Data (W19–W21)

- [ ] TikTok Ads API — pull spend, impressions, CTR, CPC, ROAS
- [ ] Meta Marketing API — pull equivalent data
- [ ] Cron `PullAdsDataJob` — hourly or daily
- [ ] Migrations `ads_campaigns`, `ads_adsets`, `ads_creatives`, `ads_metrics`
- [ ] UI: ads dashboard (filter by date, platform, campaign)
- [ ] UI: side-by-side platform comparison
- [ ] UI: drill-down per creative (link to content in the system)
- [ ] Alert engine — performance drop threshold (config per campaign)
- [ ] Notification: email/Slack on alert trigger

### Ads Create (W22–W24)

- [ ] UI: create campaign wizard (objective → audience → budget → creative pick)
- [ ] TikTok Ads API — create campaign + ad set + ad
- [ ] Meta Marketing API — create campaign + ad set + ad
- [ ] Auto UTM tagging — generate UTM params, attach to landing URL
- [ ] Tracking pixel — install Meta Pixel + TikTok Pixel on salespage (auto)
- [ ] AI recommendation — "boost winner" suggestion based on organic engagement
- [ ] AI recommendation — "kill loser" suggestion based on ROAS threshold

### Polish & Launch (W25–W26)

- [ ] E2E test (product → post → boost ads)
- [ ] Load test (queue workers, video render concurrency)
- [ ] Security audit (token storage, API rate limit, RBAC)
- [ ] User documentation (in-app help + video tutorial)
- [ ] Production release v1.0
- [ ] Retro + Phase 4 plan

---

## Ongoing (Throughout the Project)

- [ ] Weekly internal demo
- [ ] Bi-weekly retro
- [ ] Tech debt log — reviewed at end of every sprint
- [ ] Cost tracking — AI spend per module (internal dashboard)
- [ ] Security: rotate API keys quarterly
- [ ] Backup verify monthly (restore test)
