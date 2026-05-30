# Implementation Plan - Nepremičnine Portal Enhancements

A series of UI, filtering, map, pagination, and scraping updates to enhance the real estate portal's premium feel and database search capabilities.

**Status: ✅ COMPLETED** — Build verified (`next build` passed, all 6 routes compiled).

---

## ✅ Backend Updates

### [DONE] [backend/scrapers/siol.py](file:///c:/Users/jonpe/Desktop/NepremicnineAplikacija/backend/scrapers/siol.py)
- Added rental detection: if price text contains `"/mesec"`, `"/m"`, `"najem"`, or cleaned price < 5000 €, listing is classified as `"Oddaja"` (rent) instead of `"Prodaja"` (sale).

### [DONE] [backend/main.py](file:///c:/Users/jonpe/Desktop/NepremicnineAplikacija/backend/main.py)
- Implemented `send_admin_email(subject, body)` via `smtplib` + `email.mime.text`. Falls back to stdout log if SMTP env vars are not set.
- Scraper loop now skips listings with `price == 0/None` or `location` is `N/A`/empty and emails admin.
- Scraper execution runs both `buy=True` (sales) and `buy=False` (rentals).

---

## ✅ Frontend API Updates

### [DONE] [app/api/properties/route.ts](file:///c:/Users/jonpe/Desktop/NepremicnineAplikacija/frontend/nepremicnine-portal/app/api/properties/route.ts)
- `buildTitle()` now uses the real `row.type` field as the listing title when meaningful, falling back to a type-based label.
- `parseYearFromFeatures()` extracts a 4-digit construction year (1950–2030) from the `features[]` array via regex.
- `parseRoomsFromText()` matches patterns like `"2-sobno"`, `"garsonjera"`, `"studio"` from the type/title field; falls back to area-based estimate.
- `isValidListing()` filters out any listing with `price <= 0`/`null` or `location` empty/`"N/A"` — applied in all views (`home`, `raw`, `stats`).

---

## ✅ Frontend UI & Search Updates

### [DONE] [app/layout.tsx](file:///c:/Users/jonpe/Desktop/NepremicnineAplikacija/frontend/nepremicnine-portal/app/layout.tsx)
- Footer padding increased ~15%: `pt-24 pb-12`, larger grid gap (`gap-10`), larger top section bottom padding (`pb-16`), taller bottom bar (`pt-10`).

### [DONE] [app/page.tsx](file:///c:/Users/jonpe/Desktop/NepremicnineAplikacija/frontend/nepremicnine-portal/app/page.tsx)
- `handleSearch()` now builds `URLSearchParams` and redirects to `/search?type=...&location=...&minPrice=...&maxPrice=...` instead of filtering the 6 home listings locally.
- Theme toggle removed from the alert bar. Added as a **☀️/🌙 icon button** to the far right of the navbar.
- Alert bar retains the language selector.

### [DONE] [app/search/page.tsx](file:///c:/Users/jonpe/Desktop/NepremicnineAplikacija/frontend/nepremicnine-portal/app/search/page.tsx)

#### Navbar
- Removed `faArrowLeft` back arrow and the "Iskalnik" button entirely.
- Theme switcher (☀️/🌙) placed at the **far right** of the navbar.
- Added "Prikaži/Skrij karto" map toggle button (desktop only).

#### Filters
- **Tip posla** select: Prodaja + Oddaja / Prodaja / Oddaja.
- **Vrsta nepremičnine** select: Vse / Stanovanje / Hiša / Poslovni prostor / Zemljišče / Vikend — mapped via `mapTypeGroup()`.
- **Kraj dropdown**: grouped by Slovenian statistical region (Osrednjeslovenska, Gorenjska, Podravska, Obalno-kraška, etc.) using `REGION_KEYWORDS` map. Shows clean first-token `kraj` names only.
- **Min price** text input (synced from URL param on load).
- **Max price slider** (`PriceRangeSlider`): range 0–1,500,000 € in 10,000 € steps, displays "Brez omejitve" at maximum.
- All filter state is initialised from URL search params (`type`, `location`, `minPrice`, `maxPrice`, `action`).

#### Listings & Sort
- Invalid listings (price 0/null, location N/A/empty) filtered via `isValidListing()` before display.
- Default sort: **⭐ Priporočeno** (`weight` desc, then `posodobljeno_ob` desc).
- Additional sort options: Najnovejši, Cena naraščajoče/padajoče, Površina največje.
- **Pagination**: 30 ads per page (`PAGE_SIZE = 30`). Numbered page buttons with prev/next chevrons. Page resets on filter change.
- Removed `Tabela: public.nepremicnine_oglasi` label.

#### Leaflet Map Panel
- Loaded dynamically from CDN (`unpkg.com/leaflet@1.9.4`) — no SSR issues, no extra npm deps.
- Shown on desktop only (`hidden lg:block`), sticky alongside listing grid.
- Up to 50 markers placed using `CITY_COORDS` lookup; each marker has a popup with location, price, and a link to the listing.
- Toggle button in navbar hides/shows the map and expands listings to full width when hidden.

#### ETN Widget
- Collapsible accordion (`ETNWidget`) placed below the listing grid.
- Uses `ETN_PRICES` map of GURS-based average €/m² per Slovenian region.
- Displays: estimated market value, DTT tax (2%), notary fees (~0.5%), agent commission (3%), total additional costs.
- Clicking the 🧮 button on any listing card updates the widget's region and area automatically.
- Informational disclaimer included.

---

## Verification

- `next build` ran successfully: **✓ Compiled** + **✓ 8/8 static pages** generated.
- All 6 routes resolved: `/`, `/_not-found`, `/api/properties`, `/privacy`, `/search`, `/tos`.
