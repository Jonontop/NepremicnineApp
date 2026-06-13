# 🏠 vesta.si — Nepremičninski Portal (Monorepo)

**vesta.si** is an intelligent Slovenian real-estate aggregator and analytics portal. The system automatically collects listings from multiple Slovenian property portals, cleans and deduplicates them, and displays them in a fast, modern, and fully bilingual (Slovenian/English) web interface.

The project is organized as a **Monorepo** — both the data collection layer (Python scrapers) and the user interface (Next.js) live in one repository, cleanly split into `backend/` and `frontend/`.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Scrapers** | Python 3, `BeautifulSoup4`, `Requests`, `schedule` |
| **Database** | Supabase (PostgreSQL) — stores all listings, handles dedup and weight scoring |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| **Fonts** | Manrope (Google Fonts) |
| **Icons** | FontAwesome (via `@fortawesome/react-fontawesome`) |
| **Animations** | `react-countup` for live stat counters |
| **Theme** | System-aware Dark/Light mode via `ThemeProvider` + localStorage |
| **i18n** | Custom bilingual (SL/EN) system via `LanguageContext` — no page reload required |
| **Deployment** | Cloudflare Workers (via OpenNext + Wrangler) |

---

## 📁 Project Structure

```
NepremicnineAplikacija/
├── backend/                         # Python scraper worker
│   ├── main.py                      # Scheduler, DB upsert, repair, deduplication
│   ├── requirements.txt
│   └── scrapers/
│       ├── base_scraper.py          # Shared fetch/clean/price-parsing helpers
│       ├── galea.py                 # ✅ Full bulk scraper
│       ├── si21.py                  # ✅ Full bulk scraper
│       ├── siol.py                  # ⚠️ Single-page scraper (limit ~150)
│       ├── ljubljanaNepremicnine.py # ⚠️ Single-page scraper (limited)
│       ├── abcnepremicnine.py       # ⚠️ Repair-only, not in main loop
│       └── mestonepremicnin.py      # ❌ Incomplete / broken
│
└── frontend/nepremicnine-portal/    # Next.js app (vesta.si)
    ├── app/
    │   ├── layout.tsx               # Root layout: Navbar, Footer, ThemeProvider, LanguageProvider
    │   ├── page.tsx                 # Home/landing page with hero, search card, stats, listings
    │   ├── LanguageContext.tsx      # Global bilingual context (SL/EN), persisted to localStorage
    │   ├── ThemeProvider.tsx        # Dark/light theme context
    │   ├── globals.css
    │   ├── not-found.tsx            # Custom 404 page
    │   ├── components/
    │   │   ├── Navbar.tsx           # Sticky nav with dropdown, mobile menu, lang toggle
    │   │   ├── NavbarThemeToggle.tsx
    │   │   └── Footer.tsx           # Translated footer (reads LanguageContext)
    │   ├── search/page.tsx          # Full search UI: filters, price slider, grid/list, modal
    │   ├── about/page.tsx           # About page (fully bilingual)
    │   ├── faq/page.tsx             # FAQ page with accordions (fully bilingual)
    │   ├── tos/page.tsx             # Terms of Service
    │   ├── privacy/page.tsx         # Privacy Policy
    │   └── api/
    │       └── properties/route.ts  # API route — queries Supabase, returns listings/stats
    ├── lib/
    │   └── supabase.ts              # Supabase client initialisation
    ├── public/
    │   └── hero.png                 # Hero section background image
    ├── package.json
    ├── tailwind.config.js
    ├── next.config.ts
    └── wrangler.jsonc               # Cloudflare Workers deployment config
```

---

## 🌐 Pages & Features

### Home (`/`)
- Hero section with animated stats (active listings, new builds, unique locations)
- Search card with type tabs, location selector, room picker, price range inputs
- Category grid (Apartments, Houses, Commercial, Land) with live counts
- Premium listings grid (top-weighted from DB), with favourites (local state)

### Search (`/search`)
- Full-text + filter search: deal type, property type, location (grouped by region), price range slider, sort order
- Grid / List layout toggle
- Paginated results (30 per page)
- Listing detail modal with:
  - Image, location waypoint, area, source site
  - Advertised price + price-per-m² calculation
  - **ETN Zone Analysis** (historical average, market deviation, GURS tax base estimate)
  - Direct link to original listing

### About (`/about`)
- Full description of the portal's mission, technology, and workflow
- Contact information

### FAQ (`/faq`)
- 6 accordion Q&A entries covering usage, data accuracy, removal requests, and update frequency

### Not Found (`/not-found`)
- Custom 404 page

---

## 🌍 Bilingual Support (SL / EN)

Language is stored in `localStorage` and managed by `LanguageContext` (see [`app/LanguageContext.tsx`](frontend/nepremicnine-portal/app/LanguageContext.tsx)).

The language toggle button in the Navbar updates the global context **instantly** — no page reload. Every page (`/`, `/search`, `/about`, `/faq`) and the Footer reads directly from this context and renders in the selected language.

**Supported languages:**
- 🇸🇮 Slovenščina (default)
- 🇬🇧 English

---

## 🔧 Backend — Scrapers

`backend/main.py` orchestrates the scraping pipeline:

1. **Run scrapers** — each scraper fetches listings from its source portal, parses HTML, and returns structured data
2. **Upsert to Supabase** — listings are inserted or updated by unique identifier; price, area, type, and status fields are normalised
3. **Weight scoring** — listings with images, known locations, and complete data receive higher `weight` values; these surface first in the frontend
4. **Deduplication** — a daily SQL job removes duplicate entries sharing the same image URL, keeping the cheapest
5. **Scheduled runs** — the `schedule` library triggers the pipeline at fixed intervals

### Scraper Status

| Scraper | Source | Status |
|---------|--------|--------|
| `galea.py` | galea.si | ✅ Full bulk (all pages) |
| `si21.py` | si21.si | ✅ Full bulk (all pages) |
| `siol.py` | nepremicnine.siol.net | ⚠️ Single page only |
| `ljubljanaNepremicnine.py` | Ljubljana portal | ⚠️ Single page only |
| `abcnepremicnine.py` | abcnepremicnine.si | ⚠️ Repair mode only |
| `mestonepremicnin.py` | mestonepremicnin.si | ❌ Broken / incomplete |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_DB_URI=postgresql://...
```

### Frontend (`frontend/nepremicnine-portal/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 🛠️ Running Locally

### Frontend
```bash
cd frontend/nepremicnine-portal
npm install
npm run dev
```
App runs at [http://localhost:3000](http://localhost:3000).

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Requires a valid `SUPABASE_DB_URI` in `backend/.env`.

---

## 🗄️ Database Schema (Supabase)

Table: `nepremicnine_oglasi`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` / `text` | Unique listing identifier |
| `location` | `text` | Raw location string from source |
| `price` | `numeric` | Listing price (total or per m²) |
| `price_unit` | `text` | `null` (total) or `m2` |
| `area` | `numeric` | Floor area in m² |
| `status` | `text` | `prodaja` / `oddaja` / `drugo` |
| `type` | `text` | Raw property type string |
| `site` | `text` | Source portal name |
| `link` | `text` | Original listing URL |
| `image` | `text` | Listing image URL |
| `features` | `text[]` | Additional scraped features |
| `weight` | `integer` | Quality/relevance score (0–100) |
| `posodobljeno_ob` | `timestamptz` | Last updated timestamp |

---

## 📦 Key Dependencies (Frontend)

| Package | Purpose |
|---------|---------|
| `next` | App framework (App Router) |
| `react`, `react-dom` | UI library |
| `@supabase/supabase-js` | Supabase client |
| `@fortawesome/react-fontawesome` | Icon library |
| `@fortawesome/free-solid-svg-icons` | Solid icon set |
| `react-countup` | Animated number counters |
| `tailwindcss` | Utility-first CSS |

---

## 📜 License

All rights reserved. Data displayed is sourced from publicly available listings and is informational only.  
© 2025 vesta.si — Slovenia.
