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
python -m pytest          # 92 testov, brez omrežja
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

4. Paginacija: beri strani, dokler ne dobiš prazne strani; omeji število strani (`max_pages`).
5. Deduplikacija znotraj vira: preskoči ponovljene `link`.
6. Filtriraj po `buy` (prodaja/oddaja) — stran, ki jo bereš, mora ustrezati `status`.
7. Razčlenjevanje ene kartice daj v ločeno metodo (`_parse_card` oz. `_parse_listing_card`) in dodaj `parse_page(soup)`, ki vrne seznam oglasov. Tako lahko parser testiraš na shranjeni strani brez omrežja:

   ```python
   def test_parse_moj_vir():
       soup = BeautifulSoup(fixture("moj_vir_page.html").read_text(), "html.parser")
       listings = MojScraper().parse_page(soup)
       assert listings[0]["price"] == 189000
   ```
8. Preveri rezultat:

   ```bash
   cd backend
   python -c "from scrapers.<vir> import <Klasa>; r=<Klasa>().scrape_listings(buy=True); print(r.summary())"
   ```

9. Prijavi vir v `scrapers/registry.py` (`SourceSpec`). `main.py` in `run_scraper.py` ga od tam naprej poganjata sama — ne dodajaj novih uvozov v ti dve datoteki. Če vir še ni preverjen, nastavi `enabled=False` (kot `realinvest`) ali `bulk=False`.
10. Dodaj vir v `KNOWN_SITES` v `app/api/scraper-health/route.ts` in v tabelo v `README.md`.
11. Dodaj vsaj en fixture test v `backend/tests/test_sources.py`.
12. Če vir ne deluje zanesljivo, ga ne vključi v produkcijski cikel — dokumentiraj ga kot eksperimentalnega.

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
