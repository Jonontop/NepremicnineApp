# 🏠 SmartNepremičnine — Monorepo

SmartNepremičnine je napreden slovenski agregator in analizator nepremičninskih oglasov. Projekt avtomatsko zbira podatke iz različnih slovenskih nepremičninskih portalov, jih očisti, pametno razvrsti ter prikaže v sodobnem, hitrem in interaktivnem uporabniškem vmesniku.

Projekt je organiziran kot **Monorepo**, kar pomeni, da sta tako zbiranje podatkov (Python) kot uporabniški vmesnik (Next.js) shranjena v enem repozitoriju, razdeljena na čisti `backend` in `frontend`.

---

## 🚀 Tehnološki sklad (Tech Stack)

Aplikacija izkorišča najboljše lastnosti različnih tehnologij:

- **Backend / Scrapers (Python):** `BeautifulSoup4` in `Requests` za stabilno strganje podatkov. Vključuje vgrajeno rotacijo User-Agentov in naključne časovne zamike (anti-blocking zaščita) ter napredno Regex čiščenje cen.
- **Baza podatkov (Supabase):** PostgreSQL baza za shranjevanje oglasov, avtomatsko čiščenje decimalnih napak z SQL skriptami ter napredno sortiranje preko uteži (`weight`).
- **Frontend (Next.js 14+ & Tailwind CSS):** Sodoben in odziven uporabniški vmesnik, ki podpira sistemski **Dark Mode**, gladke hover animacije na karticah oglasov, napredne filtre in po meri ukrojeno **404 Error pristajalno stran**.

---

## 📁 Struktura projekta

```text
NepremicnineAplikacija/
├── backend/                # PYTHON BACKEND
│   ├── scrapers/           # Posamezni scraperji za portale
│   │   ├── base_scraper.py # Glavna klasa z regex logiko in anti-block zaščito
│   │   └── siol_scraper.py # Specifična logika za Siol nepremičnine
│   └── run_scrapers.py     # Skripta za zagon celotnega backend cikla
│
├── frontend/               # NEXT.JS FRONTEND
│   ├── app/                # App Router struktura
│   │   ├── search/         # Iskalnik z naprednimi filtri in hover efekti
│   │   ├── layout.tsx      # Globalni layout, razširjen Footer in Dark Mode podpora
│   │   ├── page.tsx        # Vstopna (Landing) stran
│   │   └── not-found.tsx   # Custom 404 Error Landing Page
│   ├── lib/                # Inicializacija in povezava s Supabase
│   ├── package.json        # Node.js odvisnosti in skripte
│   └── tailwind.config.js  # Konfiguracija stilov
│
├── .gitignore              # Zaščita občutljivih datotek (.env, node_modules, cache)
└── README.md               # Dokumentacija projekta (to kar bereš)