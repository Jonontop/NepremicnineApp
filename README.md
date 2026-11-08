# 🏠 vesta.si — Nepremičninski Portal (Monorepo)

**vesta.si** je slovenski agregator nepremičninskih oglasov: Python scraperji pobirajo oglase iz več portalov, jih čistijo in združujejo v eno bazo (Supabase/PostgreSQL), Next.js frontend pa jih prikaže v hitrem, dvojezičnem (SL/EN) vmesniku s filtri in analizo cen.

Repozitorij je monorepo: `backend/` (scraping + baza) in `frontend/` (Next.js aplikacija).

---

## Kazalo

- [Arhitektura](#arhitektura)
- [Struktura projekta](#struktura-projekta)
- [Namestitev in zagon](#namestitev-in-zagon)
- [Okoljske spremenljivke](#okoljske-spremenljivke)
- [Frontend: strani in API](#frontend-strani-in-api)
- [Backend: pipeline](#backend-pipeline)
- [Scraperji](#scraperji)
- [Testi](#testi)
- [Deploy](#deploy)
- [Dokumentacija](#dokumentacija)

---

## Arhitektura

```
   ┌───────────────┐   HTML / JSON-LD   ┌───────────────┐
   │  9 portalov   │ ─────────────────► │   Scraperji   │
   └───────────────┘                    └───────┬───────┘
                                                │ dict zapisi
                                        ┌───────▼───────┐
                                        │  Validacija   │  cena > 0, kraj, link
                                        └───────┬───────┘
                                                │ upsert ON CONFLICT (link)
                                        ┌───────▼───────┐
                                        │Supabase (PG)  │  nepremicnine_oglasi
                                        └───────┬───────┘
                                                │ PostgREST / supabase-js
                                        ┌───────▼───────┐
                                        │    Next.js    │  /, /search, /api/*
                                        └───────────────┘
```

Podrobnosti: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Baza: [docs/DATABASE.md](docs/DATABASE.md) · Načrt razvoja: [docs/FUTURE_PLAN.md](docs/FUTURE_PLAN.md)

---

## Struktura projekta

```
NepremicnineApp/
├── backend/
│   ├── main.py                      # 24/7 scheduler: scrape → upsert → repair → dedupe
│   ├── run_scraper.py               # enkratni polni zagon (pisanje prek REST API)
│   ├── normalize_locations.py       # čiščenje/enotno poimenovanje lokacij (dry-run privzeto)
│   ├── requirements.txt
│   ├── requirements-dev.txt         # pytest
│   ├── pytest.ini                   # privzeto brez mrežnih testov
│   ├── tests/                       # pytest: normalizatorji, modeli, parserji, register
│   │   ├── fixtures/                # shranjene HTML strani (brez živih klicev)
│   │   ├── test_normalizers.py
│   │   ├── test_models.py
│   │   ├── test_base_scraper.py
│   │   ├── test_registry.py
│   │   └── test_sources.py
│   ├── test_fast.py                 # hitri contract testi (mreža)
│   ├── test_scrapers.py             # polni contract testi vseh scraperjev (mreža)
│   └── scrapers/
│       ├── base_scraper.py          # osnova: timeout, retry/backoff, throttle, ScrapeResult
│       ├── models.py                # SearchQuery, Listing, ScrapeResult
│       ├── normalizers.py           # cene, površine, URL, status, tip
│       ├── registry.py              # seznam virov (kaj se poganja in kaj ne)
│       ├── galea.py                 # galea.si
│       ├── si21.py                  # nepremicnine.si21.com
│       ├── siol.py                  # nepremicnine.siol.net
│       ├── ljubljanaNepremicnine.py # ljubljananepremicnine.si
│       ├── mestonepremicnin.py      # mestonepremicnin.si
│       ├── abcnepremicnine.py       # abc-nepremicnine.si
│       ├── insa.py                  # insa.si
│       ├── simobilia.py             # simobilia.si
│       ├── solterra.py              # solterra.si
│       ├── realinvest.py            # ⚠️ eksperimentalno, ni v produkcijskem ciklu
│       ├── wordpress_api.py         # generični WP REST API scraper (osnova)
│       └── agency_scraper.py        # konfigurabilni framework za male agencije
│
├── frontend/
│   ├── TODO.md                      # backlog
│   ├── implementation_plan.md       # zapis zadnjega UI/API svežnja
│   └── nepremicnine-portal/         # Next.js 16 (App Router)
│       ├── app/
│       │   ├── layout.tsx           # metadata, fonti, ThemeProvider, LanguageProvider
│       │   ├── page.tsx             # domov: hero, iskalna kartica, kategorije, oglasi
│       │   ├── search/page.tsx      # iskalnik: filtri, slider, grid/list, modal + ETN
│       │   ├── about|faq|tos|privacy/page.tsx
│       │   ├── admin/page.tsx       # ⚠️ javna nadzorna plošča (brez avtentikacije)
│       │   ├── dashboard/page.tsx   # ista vsebina kot /admin
│       │   ├── dashboard/DashboardContent.tsx
│       │   ├── LanguageContext.tsx  # SL/EN, localStorage + useSyncExternalStore
│       │   ├── ThemeProvider.tsx    # dark/light, localStorage + sistemska nastavitev
│       │   ├── not-found.tsx
│       │   └── api/
│       │       ├── properties/route.ts       # GET oglasi (raw | home | stats)
│       │       └── scraper-health/route.ts   # GET zdravje scraperjev
│       ├── public/                  # hero.png, ikone, _headers
│       ├── next.config.ts           # images, OpenNext dev init
│       ├── open-next.config.ts
│       ├── wrangler.jsonc           # Cloudflare Workers konfiguracija
│       └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── FUTURE_PLAN.md
├── CONTRIBUTING.md
└── README.md
```

---

## Namestitev in zagon

### 1. Frontend

```bash
cd frontend/nepremicnine-portal
npm install
cp .env.example .env.local   # vpiši svoj Supabase projekt
npm run dev                  # http://localhost:3000
```

| Ukaz | Namen |
|------|-------|
| `npm run dev` | razvojni strežnik (Turbopack) |
| `npm run build` | produkcijska gradnja |
| `npm start` | zagon zgrajene aplikacije |
| `npm run lint` | ESLint (mora biti brez opozoril) |
| `npm run preview` | OpenNext build + lokalni Cloudflare preview |
| `npm run deploy` | OpenNext build + deploy na Cloudflare |

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env               # vpiši SUPABASE_* vrednosti
python run_scraper.py              # enkratni polni zagon vseh scraperjev
```

`python main.py` zažene 24/7 proces: takoj en cikel, nato ob 05:00 in 17:00.

> `main.py` potrebuje `SUPABASE_DB_URI` (neposredna PostgreSQL povezava) za popravilo manjkajočih podatkov in čiščenje podvojenih slik. Brez nje se ti dve fazi samodejno preskočita, pisanje pa gre prek REST API.

---

## Okoljske spremenljivke

### `backend/.env`

| Spremenljivka | Obvezna | Namen |
|---------------|---------|-------|
| `SUPABASE_DB_URI` | priporočena | PostgreSQL connection string (omogoči repair + dedupe) |
| `SUPABASE_URL` | da* | `https://<projekt>.supabase.co` za REST pisanje |
| `SUPABASE_SERVICE_KEY` | da* | service-role ključ (samo strežnik, nikoli v frontend) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | ne | poročila o izločenih oglasih |
| `ADMIN_EMAIL` | ne | prejemnik poročil (privzeto `podpora@smartnepremicnine.si`) |

\* Potrebujete vsaj enega od: `SUPABASE_DB_URI` **ali** (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY`).

### `frontend/nepremicnine-portal/.env.local`

| Spremenljivka | Namen |
|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projekta |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | novi Supabase publishable key (`sb_publishable_...`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | starejši anon key (uporabi se, če publishable ni nastavljen) |

API route uporabi publishable ključ, če obstaja, sicer anon ključ. Brez obeh route vrne prazne rezultate, strani pa prikažejo prazna stanja namesto napake.

---

## Frontend: strani in API

| Pot | Vsebina |
|-----|---------|
| `/` | hero s števci, iskalna kartica (tip, kraj, sobe, cena), kategorije z števili, premium oglasi |
| `/search` | filtri (posel, vrsta, kraj po regijah, sobe, cena), razvrščanje, grid/list, 30 na stran, modal z ETN analizo |
| `/about`, `/faq`, `/tos`, `/privacy` | vsebinske in pravne strani (SL/EN) |
| `/dashboard`, `/admin` | nadzorna plošča zdravja scraperjev — **trenutno brez avtentikacije** |
| neobstoječa pot | prilagojena 404 stran |

### `GET /api/properties`

| Parameter | Privzeto | Opis |
|-----------|----------|------|
| `limit` | `50` | 1–1000 |
| `offset` | `0` | paging prek PostgREST omejitve 1000 vrstic |
| `orderBy` | `posodobljeno_ob_desc` | `weight_desc` ali `posodobljeno_ob_desc` |
| `view` | `raw` | `raw` (surove vrstice), `home` (mapirano za domov), `stats` (agregati) |

Oglasi s ceno <= 0 ali praznim/`N/A` krajem se filtrirajo. `view=stats` prešteje **celotno** tabelo (paging po 1000 vrstic), ne le prve strani.

### `GET /api/scraper-health`

Vrne skupne števce, statistiko po viru (prodaja/oddaja, cena = 0, brez slike, brez lokacije, povprečna cena, zadnja osvežitev) in kakovost podatkov za `/dashboard`.

---

## Backend: pipeline

`main.py` izvede `celoten_zagon_strganja()`:

1. **Scrape** — za vsak vir in za `buy=True`/`False` (prodaja/oddaja) požene scraper; napaka enega vira ne ustavi cikla.
2. **Validacija** — izloči oglase brez cene (> 0), brez kraja ali brez povezave; če je SMTP nastavljen, pošlje poročilo administratorju.
3. **Upsert** — `INSERT ... ON CONFLICT (link) DO UPDATE` (PostgreSQL), sicer REST API z `on_conflict=link` v batchih po 100.
4. **Repair** — obnovi ceno/sliko iz podstrani; 404 označi kot `potečeno` (samo z `SUPABASE_DB_URI`).
5. **Dedupe** — dnevno odstrani oglase z isto sliko in obdrži najcenejšega (samo z `SUPABASE_DB_URI`).
6. **Schedule** — knjižnica `schedule`, 05:00 in 17:00.

---

## Scraperji

Vsi scraperji dedujejo `BaseScraper` in vračajo seznam slovarjev s polji:
`site, status, type, price, location, area, features, link, image, price_unit, novogradnja, leto_izgradnje`.

| Scraper | Vir | Status |
|---------|-----|--------|
| `galea.py` | galea.si | ✅ produkcijsko |
| `si21.py` | nepremicnine.si21.com | ✅ produkcijsko (JSON-LD, novogradnje) |
| `siol.py` | nepremicnine.siol.net | ✅ produkcijsko |
| `ljubljanaNepremicnine.py` | ljubljananepremicnine.si | ✅ produkcijsko |
| `mestonepremicnin.py` | mestonepremicnin.si | ✅ produkcijsko |
| `abcnepremicnine.py` | abc-nepremicnine.si | ✅ produkcijsko |
| `insa.py` | insa.si | ✅ produkcijsko |
| `simobilia.py` | simobilia.si | ✅ produkcijsko |
| `solterra.py` | solterra.si | ✅ produkcijsko |
| `realinvest.py` | realinvest.si | ⚠️ eksperimentalno — ni v `main.py`/`run_scraper.py`; pred vklopom preveri donos in kakovost |

Pravila za nove scraperje: glej [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Testi

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest          # 92 testov, brez omrežja (fixtures)
python -m pytest -m network   # mrežni testi, če so označeni
python test_fast.py       # hitri testi (INSA, Simobilia, SolTerra, ABC, Ljubljana + DB)
python test_scrapers.py   # polni contract testi vseh scraperjev + DB
```

`pytest` suite ne dostopa do interneta: parserje preverja na shranjenih straneh v `tests/fixtures/`, zato teče v CI in ob vsaki spremembi. `test_fast.py` in `test_scrapers.py` dostopata do živih strani in baze, zato sta počasna in odvisna od dosegljivosti virov. Frontend:

```bash
cd frontend/nepremicnine-portal
npm run lint && npx tsc --noEmit && npm run build
```

---

## Deploy

Frontend se objavi na Cloudflare Workers prek OpenNext:

```bash
cd frontend/nepremicnine-portal
npm run deploy
```

`wrangler.jsonc` vsebuje javne `NEXT_PUBLIC_*` spremenljivke (Supabase URL + publishable key) in self-reference binding za cache. Service-role ključ in `SUPABASE_DB_URI` ostajata samo v backendu.

Backend teče kot stalni proces (VPS, container, systemd) — potrebuje izhod v internet in dostop do baze.

---

## Dokumentacija

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — plasti, pipeline, UI sistem
- [docs/DATABASE.md](docs/DATABASE.md) — shema, omejitve, indeksi, RLS, setup
- [docs/FUTURE_PLAN.md](docs/FUTURE_PLAN.md) — načrt razširitve po fazah
- [CONTRIBUTING.md](CONTRIBUTING.md) — razvoj, konvencije, nov scraper

---

## Licenca

Vse pravice pridržane. Podatki so zbrani iz javno dostopnih oglasov in so informativne narave.
© 2026 vesta.si — Slovenija.
