# Plan — Projek Infra

Deployment & development plan, broken down by phase. This is a living document — update weekly.

---

## 0. Pre-Kickoff (Week 0 — before sprint 1)

Before coding, get these sorted. **Current resource status:**
- ✅ Boilerplate available from a previous project — saves ~1 week of setup
- ⬜ New VPS (separate from `103.179.57.122` used by Sahabat CPNS) — needs to be provisioned
- ⬜ Domain not purchased yet
- ⬜ API keys (TikTok Dev / Meta Dev / Google Ads) not registered — register early (review can take 1–3 weeks)
- ⬜ Storage: local VPS for now, migrate to object storage in Phase 2

| # | Item | Owner | Status |
|---|---|---|---|
| 0.1 | Finalize PRD v1.0 (lock MVP scope) | PM | ⬜ |
| 0.2 | Tech RFC (database schema, API contracts) | Tech Lead | ⬜ |
| 0.3 | AI provider benchmark (LLM, image, TTS) — cost vs quality | Tech | ⬜ |
| 0.4 | Setup repo (GitHub/GitLab), basic CI/CD | DevOps | ⬜ |
| 0.5 | **Provision new VPS** (IDCloudHost or other provider) + harden | DevOps | ⬜ |
| 0.6 | Decision: multi-tenant vs single-tenant | Owner | ⬜ |
| 0.7 | **Purchase domain** + DNS setup + Let's Encrypt SSL | DevOps | ⬜ |
| 0.8 | Brand kit & Phase 1 module wireframes | Designer | ⬜ |
| 0.9 | **Register TikTok for Developers** (review 1–2 weeks) | PM | ⬜ |
| 0.10 | **Register Meta for Developers** + Business Verification | PM | ⬜ |
| 0.11 | **Register Google Ads API access** | PM | ⬜ |
| 0.12 | **Adapt boilerplate** to Projek Infra structure (audit, cleanup, rename) | Tech Lead | ⬜ |

---

## 1. Phase 1 — MVP (8–10 weeks)

**Goal:** baseline system usable internally for poster generation + product management.

### Scope

- ✅ Auth & user management (admin + member roles)
- ✅ Product Hub — product CRUD, asset library (image/video upload), brand voice form
- ✅ AI Poster generator (1 output → PNG, multi-size 1:1 / 4:5 / 9:16)
- ✅ Manual posting → export poster (download), no auto-publish yet
- ✅ Dashboard skeleton (sidebar nav, empty states, settings)

### Out-of-scope for Phase 1

- ❌ Video AI
- ❌ Salespage AI
- ❌ Auto posting to platforms
- ❌ Ads integration

### Milestone breakdown

| Week | Deliverable |
|---|---|
| W1 | Repo setup, base Laravel + Inertia + React skeleton, auth working |
| W2 | Product Hub CRUD (model, migration, controller, UI list + form) |
| W3 | Asset library (S3 upload, thumbnail, simple versioning) |
| W4 | Brand voice form + branded preview component |
| W5 | AI integration layer (provider abstraction, queue job, retry) |
| W6 | Poster generator — pipeline LLM copy → image gen → brand overlay |
| W7 | Poster variants UI + download/export |
| W8 | Dashboard polish + bug fix + internal QA |
| W9 | UAT with internal team · fixes |
| W10 | Phase 1 demo + retro |

### Phase 1 Deployment

**Server:** new VPS (separate from `103.179.57.122` used by Sahabat CPNS). Recommended initial spec:
- 4 vCore · 8 GB RAM · 100 GB SSD (Phase 1)
- Upgrade to 8 vCore · 16 GB · 200 GB in Phase 2 (when video rendering becomes active)

```
/var/www/projek-infra/
├── current/        (symlink → current release)
├── releases/       (release history)
└── shared/
    ├── .env
    ├── storage/    (file uploads — local filesystem in Phase 1)
    └── log/
```

Runtime stack:
- Nginx (reverse proxy + Let's Encrypt SSL)
- PHP 8.3-FPM
- MySQL 8 (or PostgreSQL 16)
- Redis 7
- Supervisor → Laravel Horizon workers
- **Storage:** local VPS filesystem under `shared/storage/` (Phase 1). Mount a separate disk if possible, so migration is easier later.
- Domain: TBD (needs to be purchased + DNS pointed to the new VPS)

Deployment pipeline: GitHub Actions → SSH deploy script (Deployer / custom). Zero-downtime via release symlink swap.

> **Storage note:** because we're using local filesystem, code should use the Laravel Filesystem disk abstraction (`local` driver in Phase 1). When we migrate to S3-compatible later, only the disk config changes — application code stays the same.

---

## 2. Phase 2 — Expand (6–8 weeks)

**Goal:** production-ready system — all content types + auto posting live.

### Scope

- ✅ AI Video generator (Remotion + FFmpeg + TTS pipeline)
- ✅ AI Salespage generator (HTML template + inline image, hosted on the system)
- ✅ Auto Posting to TikTok + Meta (FB/IG)
- ✅ Smart scheduling (best-time recommendation)
- ✅ Per-platform caption variants
- ✅ Approval workflow (draft → review → schedule)
- ✅ Basic analytics pull-back (views, engagement, CTR)

### Milestone breakdown

| Week | Deliverable |
|---|---|
| W11 | TikTok Marketing API integration (OAuth + post endpoint) |
| W12 | Meta Graph API integration (FB Page + IG Business posting) |
| W13 | Scheduler + queue worker for delayed posts |
| W14 | AI Video pipeline (script → TTS → Remotion render → MP4) |
| W15 | AI Salespage (HTML template engine, hosted route + custom slug) |
| W16 | Approval workflow + notifications |
| W17 | Analytics pull-back (cron job, store metrics, simple chart) |
| W18 | UAT + production launch prep |

### Phase 2 Deployment

Additional components:

- **Video render worker** — dedicated queue (CPU-bound). Consider a separate worker server if load is heavy.
- **FFmpeg** installed on the server.
- **🔄 Migrate storage to object storage** — at this point video volume gets large and local filesystem starts taxing the VPS. Migrate to S3-compatible (Wasabi / Cloudflare R2 / IDCloudHost Object Storage). Only the Laravel disk config changes — code stays untouched.
- **CDN** (Cloudflare/Bunny) for video & salespage asset delivery.
- **Webhook receiver** — endpoints for TikTok/Meta notifications (post status, analytics callback).
- **Cron schedule** — `php artisan schedule:run` every minute (analytics pull, post executor).

---

## 3. Phase 3 — Ads Loop (6–8 weeks)

**Goal:** close the loop — ads data flowing in + automated ads creation.

### Scope

- ✅ Ads dashboard (TikTok Ads + Meta Ads): spend, impressions, CTR, CPC, ROAS
- ✅ Per-campaign / ad-set / creative breakdown
- ✅ Side-by-side platform comparison
- ✅ Performance drop alerts (threshold-based)
- ✅ Create ads from the system — pick creative, set budget/audience/objective, launch
- ✅ Auto UTM + tracking pixel tagging
- ✅ Performance feedback loop → AI recommendations per product

### Milestone breakdown

| Week | Deliverable |
|---|---|
| W19 | TikTok Ads API — data pull |
| W20 | Meta Marketing API — data pull |
| W21 | Ads dashboard UI + filter/compare |
| W22 | Create campaign flow (TikTok) |
| W23 | Create campaign flow (Meta) |
| W24 | AI recommendation engine (boost winners, kill losers) |
| W25 | E2E test + production release |
| W26 | Retro + Phase 4 roadmap |

---

## 4. System Architecture (high-level)

```
                   ┌──────────────────────────────────────┐
                   │      Web UI (Inertia + React)        │
                   └────────────────┬─────────────────────┘
                                    │ HTTP
                   ┌────────────────▼─────────────────────┐
                   │     Laravel 11 App (HTTP layer)      │
                   ├──────────────────────────────────────┤
                   │  Modules:                            │
                   │  - Product Hub                       │
                   │  - Content Studio                    │
                   │  - Auto Posting                      │
                   │  - Ads Integration                   │
                   └──┬──────────┬──────────┬────────────┘
                      │          │          │
              ┌───────▼──┐  ┌────▼─────┐  ┌─▼──────────┐
              │  MySQL/  │  │  Redis   │  │  Local /   │
              │ Postgres │  │ (queue)  │  │  S3 disk   │
              └──────────┘  └────┬─────┘  └────────────┘
                                 │
                   ┌─────────────▼──────────────┐
                   │  Horizon Workers           │
                   │  - ai-content-job          │
                   │  - poster-render-job       │
                   │  - video-render-job        │
                   │  - post-publish-job        │
                   │  - analytics-pull-job      │
                   └─────────┬──────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  ┌─────▼─────┐       ┌──────▼──────┐      ┌──────▼──────┐
  │ LLM API   │       │ TTS / Image │      │  TikTok /   │
  │ (Claude/  │       │  (11Labs /  │      │  Meta APIs  │
  │  GPT)     │       │   SDXL)     │      │             │
  └───────────┘       └─────────────┘      └─────────────┘
```

---

## 5. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| AI provider cost explodes | High | Tier-based provider + prompt cache + per-user rate limit |
| TikTok/Meta API rejection (review) | High | Register early, prepare demo video & privacy policy |
| Slow / expensive video rendering | Medium | Separate worker, queue priority, batch rendering |
| Large video storage cost | Medium | Auto-delete intermediate files, store only final outputs |
| Single VPS becomes bottleneck | Medium | Plan multi-server migration end of Phase 2 |
| Team Laravel/React capability | Low | Tech stack chosen to match team expertise |

---

## 6. Decisions Pending

| Decision | Options | Deadline |
|---|---|---|
| AI provider strategy | Stack all / pick one / mixed | Week 1 (before sprint 1) |
| Database | MySQL 8 vs PostgreSQL 16 | Week 1 |
| New VPS provider | IDCloudHost / Biznet / Niagahoster / DO | Week 0 |
| Domain + extension | `.com` / `.id` / `.my` / `.app` | Week 0 |
| Object storage (Phase 2) | Wasabi · Cloudflare R2 · IDCloudHost OS | Before Phase 2 |
| Multi-tenant or single-tenant | — | Before Phase 2 |
| Boilerplate base | [folder to be determined] | Week 0 |

---

## 7. Next Steps (Immediate)

1. ✅ Finalize this document with the team
2. ⬜ Fill `Task.md` with per-person granular tasks
3. ⬜ Setup repo + invite team
4. ⬜ Spike: AI provider benchmark (1 week)
5. ⬜ Kick off sprint 1
