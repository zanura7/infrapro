# Projek Infra

> Complete infrastructure for AI work — from product → AI content → auto posting → ads integration, all in one system.

**Status:** Pre-development · PRD v0.1
**Owner:** Team IT Bedaie
**Target launch (Phase 2 production-ready):** ~4 months from kickoff

---

## Vision

> "From a single product, the team can generate AI content (video, poster, salespage), auto-post to all platforms, then trigger ads campaigns — all in one system."

Three core principles:

- **AI-First** — content production at scale with AI, not manual.
- **Connected** — product, content, posting, and ads are all linked.
- **Single Pane** — one dashboard for control & visibility.

---

## Problems We're Solving

1. **Manual content production** — every video/poster/salespage starts from scratch.
2. **Scattered tools** — Canva, CapCut, Notion, Meta Ads dashboard. High switching cost.
3. **No single source of truth** — product info duplicated across many places.
4. **Ads not synced with content** — stale creatives, conversion drops.

---

## USP

Not a generator. **A strategist.**

```
TYPICAL TOOLS:    User thinks strategy → writes prompt → AI generates
PROJEK INFRA:     Feed product info → AI analyzes & strategizes → Smart suggestions → Pick & generate
```

What the AI analyzes: target audience · content-format fit · trending angles · competitor scan · hook ideas.

---

## 4 Modules

| # | Module | Function |
|---|---|---|
| 01 | **Product Hub** | Single source of truth (product, assets, brand voice, versioning) |
| 02 | **AI Content Studio** | Generate Video / Poster / Salespage from product data |
| 03 | **Auto Posting** | Multi-platform schedule + publish (TikTok, FB, IG, YT Shorts, Threads) |
| 04 | **Ads Integration** | View ads data + create campaigns (TikTok Ads, Meta Ads, Google Ads) |

Each module can stand alone, but real power comes when combined.

---

## Tech Stack (Proposed)

**Backend**
- Laravel 11 (familiar to the team)
- MySQL / PostgreSQL
- Redis (queue + cache)
- Laravel Horizon (queue worker)
- S3-compatible storage

**Frontend**
- Inertia.js + React
- Tailwind CSS
- shadcn/ui base
- TipTap / Plate editor
- Recharts

**AI & Integrations**
- LLM: Claude / GPT (cost-tier)
- Image: SDXL / Flux / providers
- TTS: ElevenLabs / Replicate
- Video: Remotion + FFmpeg
- Ads: TikTok Marketing API + Meta Marketing API

> Not final — open to discussion and iteration based on team capability.

---

## End-to-End Flow

```
1. Add Product
       ↓
2. Generate Content (video/poster/salespage)
       ↓
3. Review & Approve
       ↓
4. Schedule / Post
       ↓
5. Launch Ads (boost organic winners)
       ↓
6. Track & Iterate ──┐
                     │ feeds back to Step 1 → continuous loop
                     ↓
                  (Step 1)
```

---

## Roadmap

| Phase | Duration | Scope |
|---|---|---|
| **Phase 1 — MVP** | 8–10 weeks | Product Hub basic, AI Poster (1 output), manual posting, dashboard skeleton |
| **Phase 2 — Expand** | +6–8 weeks | AI Video + Salespage, Auto posting (TikTok + Meta), approval workflow, basic analytics |
| **Phase 3 — Ads Loop** | +6–8 weeks | Ads dashboard, create ads from system, performance feedback loop, AI optimization |

**Target:** production-ready at end of Phase 2 (~4 months from kickoff).

---

## Success Metrics

| Metric | Target |
|---|---|
| Content output velocity | **10×** vs manual workflow |
| Production cost saved | **60%** per piece vs hire-out |
| Idea to live post | **≤ 1 hour** briefing → published |
| Cross-platform ROAS | **2×** connected ads loop vs siloed |

---

## Open Questions

- [ ] AI provider strategy — stack everything, or pick one?
- [ ] Build vs buy — video assembly engine?
- [ ] Multi-tenant or single-tenant architecture?
- [ ] Pricing model when releasing to market?
- [ ] Data ownership for customer content?

---

## Related Docs

- [`plan.md`](./plan.md) — detailed deployment & development plan per phase
- [`Task.md`](./Task.md) — granular task breakdown
- [`mockup/`](./mockup/) — interactive HTML UI mockup v0.1

---

## Infra & Resources

### Already have
- ✅ **Boilerplate** from a previous project (Laravel base) — to be adapted

### Need to provision
- ⬜ **New VPS** — separate from `103.179.57.122` (used by Sahabat CPNS)
- ⬜ **Domain** — none yet, needs to be purchased
- ⬜ **API keys** — TikTok for Developers, Meta for Developers, Google Ads API (register early, review can take 1–3 weeks)
- ⬜ **Storage** — Phase 1 uses local VPS filesystem. Phase 2 migrates to S3-compatible (Wasabi/R2/IDCloudHost OS)
- ⬜ **AI provider keys** — Claude/GPT, ElevenLabs/Replicate, image gen
