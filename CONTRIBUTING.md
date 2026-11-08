# Prispevanje

## Nastavitev okolja

```bash
# Frontend
cd frontend/nepremicnine-portal
npm ci
cp .env.example .env.local     # vpiši Supabase URL + publishable/anon ključ
npm run dev

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env            # vpiši SUPABASE_* vrednosti
```

Nikoli ne commitaj `.env`, `.env.local`, service-role ključev ali `SUPABASE_DB_URI`.

## Preverjanja pred commitom

```bash
cd frontend/nepremicnine-portal
npm run lint
npx tsc --noEmit
npm run build

cd ../../backend
python -m compileall -q .
```

Mrežne teste (`test_fast.py`, `test_scrapers.py`) poženi, kadar spreminjaš scraperje — dostopajo do živih strani in baze.

## Konvencije

**Python**

- 4 presledki, `snake_case` za funkcije/spremenljivke, `PascalCase` za razrede.
- Scraperji dedujejo `BaseScraper`; skupno logiko dodaj tja, ne v vsak scraper posebej.
- Povezave vedno sestavi z `self.absolute_url(href)` (ne z ročnim lepljenjem `base_url`).
- Dnevnik naj bo v slovenščini in naj vsebuje ime vira, npr. `[galea] …`.
- Izjeme pri posameznem oglasu ujemi in preskoči (`continue`), nikoli ne ustavi celotnega scraperja.

**TypeScript / React**

- Strogi tipi; brez `any`, razen na meji z zunanjimi podatki (in tam takoj zoži tip).
- Odjemalske komponente označi z `"use client"`; podatke pridobivaj v `app/api/*/route.ts`.
- Slog: Tailwind utility razredi, temni način prek `dark:` variantov.
- Besedila ne dodajaj neposredno v JSX, če je stran dvojezična — dodaj ključ v oba jezika (`sl` in `en`).
- Ne uvažaj `@supabase/supabase-js` v odjemalske komponente; ključi ostanejo na strežniku.

## Nov scraper

1. Ustvari `backend/scrapers/<vir>.py` in deduj `BaseScraper`.
2. Implementiraj `scrape(self, buy=True, **kwargs)`.
3. Vrni seznam slovarjev s polji:

   ```python
   {
       "site": self.name,
       "status": "prodaja" if buy else "oddaja",
       "type": "...",
       "price": int,                # > 0
       "price_unit": "total" | "per_m2",
       "location": "...",           # ne "N/A"
       "area": float,
       "features": [...],
       "link": self.absolute_url(href),
       "image": "...",
       "novogradnja": bool,
       "leto_izgradnje": int | None,
   }
   ```

4. Paginacija: beri strani, dokler ne dobiš prazne strani; omeji število strani (safety limit).
5. Deduplikacija znotraj vira: preskoči ponovljene `link`.
6. Filtriraj po `buy` (prodaja/oddaja) — stran, ki jo bereš, mora ustrezati `status`.
7. Preveri rezultat:

   ```bash
   cd backend
   python -c "from scrapers.<vir> import <Klasa>; r=<Klasa>().scrape(buy=True); print(len(r), r[:1])"
   ```

8. Dodaj vir v `KNOWN_SITES` v `app/api/scraper-health/route.ts`, v tabelo v `README.md` in v `main.py`/`run_scraper.py`.
9. Če vir ne deluje zanesljivo, ga ne vključi v produkcijski cikel — dokumentiraj ga kot eksperimentalnega (kot `realinvest.py`).

## Commit sporočila

Kratko, v velelniku, z razlogom v telesu:

```
Popravi podvojene povezave v siol scraperju

Absolutni href se je pripenjal na base_url, zato so bile shranjene
povezave v obliki https://portal/https://portal/...
```

Ena logična sprememba na commit. Ne mešaj refaktoriranja s funkcionalnimi spremembami.

## Pull request

- Opiši, kaj se spremeni in zakaj; priloži `npm run lint` / `npx tsc --noEmit` rezultat.
- Če spreminjaš bazo, priloži SQL in posodobi `docs/DATABASE.md`.
- Če spreminjaš vedenje scraperja, navedi vir in primer oglasa.
