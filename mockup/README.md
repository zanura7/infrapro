# Mockup UI · Phase 1 complete

Static HTML mockup for **Projek Infra**. No build step required — Tailwind CDN + Lucide icons + Google Fonts (Playfair Display + Inter).

---

## Files in this folder

| File | Purpose |
|---|---|
| [`auth.html`](./auth.html) | Login / Register / Forgot password (unauthenticated state) |
| [`onboarding.html`](./onboarding.html) | 5-step first-time setup wizard (welcome → workspace → first product → brand voice → done) |
| [`index.html`](./index.html) | Main authenticated app — all in-product views with sidebar navigation |

## How to open

```bash
# Windows — double-click any file, or:
start mockup/auth.html

# Or run a tiny local server (better CDN caching):
npx serve mockup
# then visit http://localhost:3000/auth.html
```

---

## Recommended demo flow

1. Open **`auth.html`** → click "Create one" to see register, "Forgot password?" to see recovery
2. Open **`onboarding.html`** → walk through the 5 steps
3. Open **`index.html`** → land on Dashboard, then navigate the modules from the sidebar

---

## All routes in `index.html`

Each view is reachable via URL hash (e.g. `index.html#product-detail`):

### Main modules
| Hash | View | Phase |
|---|---|---|
| `#dashboard` | Dashboard — KPI hero, recent activity, this-week schedule | 1 |
| `#products` | Product Hub list — featured product + grid + asset preview | 1 |
| `#products-empty` | Empty state — no products yet, CTA to add first | 1 |
| `#product-detail` | Product detail with 5 tabs (Master / Assets / Brand Voice / Versions / Linked Content) | 1 |
| `#product-new` | Create/Edit product — 4-section long form | 1 |

### AI Content Studio (Poster only in Phase 1)
| Hash | View |
|---|---|
| `#studio-start` | Step 1 — pick product + output type + goal |
| `#studio` | Steps 2–3 — AI strategy panel + smart suggestions |
| `#studio-generating` | Step 4 — queue worker progress (pipeline steps, ETA, job ID) |
| `#studio-results` | Step 5 — 6-poster gallery with filter, regen, download |

### Workspace
| Hash | View |
|---|---|
| `#settings` | Settings — side tabs (Profile / Team / Integrations / Usage & Billing / Workspace) |

### Phase 2/3 preview (not in Phase 1 scope, but visible in mockup)
| Hash | View | Phase |
|---|---|---|
| `#posting` | Auto Posting — connected platforms + week schedule | 2 |
| `#ads` | Ads Integration — KPI strip + chart + campaigns table | 3 |

### Modals (opened via in-page buttons)
- **Asset upload** — drawer with drop zone, tag selector, upload queue (open from Product Detail → Asset Library tab → Upload, or `data-go="asset-upload"`)
- **Export** — download poster ZIP options (open from Studio Results → Download all)

---

## Phase 1 deliverables · status

Aligned with `plan.md` Phase 1 scope:

| Item | Mockup view | Done |
|---|---|---|
| Auth & user management | `auth.html` | ✅ |
| First-time onboarding | `onboarding.html` | ✅ |
| Dashboard skeleton | `#dashboard` | ✅ |
| Product Hub — CRUD list | `#products`, `#products-empty` | ✅ |
| Product detail with versioning, assets, brand voice | `#product-detail` | ✅ |
| Product create form | `#product-new` | ✅ |
| Asset library + upload modal | `#product-detail` (Assets tab) + modal | ✅ |
| AI Poster Studio · wizard 1–5 | `#studio-start` → `#studio` → `#studio-generating` → `#studio-results` | ✅ |
| Manual posting (export only) | Export modal from Studio Results | ✅ |
| Settings (profile, team, integrations, usage) | `#settings` | ✅ |

---

## Design system

- **Background:** `ink-50` (cream `#FAFAF7`) for content, `ink-950` (deep navy `#070C16`) for hero/sidebar/modals
- **Primary accent:** `brand-500` cyan `#06B6D4` (heading highlight, active CTA, selected state)
- **Secondary accent:** `flame-500` orange `#F97316` (alerts, Phase 2/3 badges, warning chips)
- **Display font:** Playfair Display (H1/H2, KPI numbers, hooks, quotes)
- **Body font:** Inter
- **Radius:** `rounded-xl` / `rounded-2xl` cards, `rounded-lg` buttons/badges, `rounded-full` chips
- **Shadow:** soft (`0 1px 2px / 0 8px 24px -8px`)

---

## What's intentionally not in this mockup

- **Mobile responsive** — desktop-first; some views will need a mobile pass before going to the real app
- **Auto Posting full feature** — only preview view shown (Phase 2 scope)
- **Ads Integration full feature** — only preview view shown (Phase 3 scope)
- **Real interactivity** — forms don't submit, generated posters are placeholders, charts are static SVG

After feedback, this becomes the spec for the shadcn/ui component library in the Laravel + Inertia repo.
