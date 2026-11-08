# Arhitektura

Dokument opisuje, kako so podatki povezani od vira do uporabnikovega zaslona, in kje so meje posameznih plasti.

## Plasti

| Plast | Lokacija | Odgovornost |
|-------|----------|-------------|
| Zajem | `backend/scrapers/*` | HTML/JSON-LD → normiran slovar oglasa |
| Orkestracija | `backend/main.py`, `run_scraper.py` | zagon, validacija, upsert, repair, dedupe |
| Shramba | Supabase (PostgreSQL + PostgREST) | ena tabela `nepremicnine_oglasi`, dedup po `link` |
| Branje (BFF) | `frontend/nepremicnine-portal/app/api/*` | strežniško branje z anon/publishable ključem, mapiranje za UI |
| Predstavitev | `frontend/nepremicnine-portal/app/**` | strani, filtri, modal, tema, jezik |

Frontend **nikoli** ne piše v bazo in nikoli ne vidi service-role ključa.

## Skupna pogodba

Trije moduli določajo, kaj je "en oglas", ne glede na vir:

| Modul | Vsebina |
|-------|---------|
| `scrapers/models.py` | `SearchQuery` (kaj iščemo), `Listing` (normiran oglas), `ScrapeResult` (izid enega zagona) |
| `scrapers/normalizers.py` | čiste funkcije za ceno, površino, enoto, leto, URL, status in tip |
| `scrapers/registry.py` | en seznam resnice: kateri viri obstajajo, kateri so vklopljeni, kateri podpirajo polni zajem |

Zato `main.py` in `run_scraper.py` ne uvažata več posameznih scraperjev — vire dobita iz registra (`registry.build_all()`), `tests/test_registry.py` pa preveri, da se vsak vklopljen vir da ustvariti.

`ScrapeResult` je vedno vrnjen, tudi ko vir odpove:

```python
result = scraper.scrape_listings(buy=True)
result.ok          # False, če je scrape() vrgel izjemo
result.error       # "Timeout: ..."
result.listings    # list[Listing]
result.storable    # le oglasi s ceno, krajem in povezavo
result.summary()   # ena vrstica za dnevnik
```

## Zajem: `BaseScraper`

`scrapers/base_scraper.py` ponuja:

- `_get(url)` — `timeout=15`, do `max_retries=2` ponovitve z exponential backoff (največ 30 s), upošteva `Retry-After` pri 429, ob 404 vrne `None` (oglas je potekel), ob drugih 4xx/5xx zabeleži in vrne `None`.
- `_get_soup(url)` — kot zgoraj + `BeautifulSoup`; povečuje `pages_fetched`.
- `_throttle()` — naključen premor `min_delay`–`max_delay` (privzeto 1–2,5 s) med zahtevami istega vira.
- `clean_price(text)` — odstrani enote, obdrži prvo vrednost iz razpona (`547.522 - 591.067 €` → `547522`), zavrne nerealne vrednosti (> 50.000.000 €).
- `clean_area(text)` — vejico pretvori v piko, pobere prvo število.
- `detect_price_unit(text)` — `per_m2` samo pri `€/m2`, `/m²` ipd.; najemnina `1.200 €/mesec` ostane `total`.
- `extract_year(text)` — 4-mestno leto v razponu 1850–2039.
- `absolute_url(href)` — absolutne povezave pusti, protocol-relative (`//cdn…`) dopolni, relativne pripne na `base_url`.
- `scrape_listings(buy=…, query=…)` — ovije `scrape()` v `ScrapeResult` in izjeme spremeni v `result.error`.
- `extract_detail_page(soup)` — privzeti fallback za repair (OG meta cena/slika).

Vsak scraper implementira `scrape(buy=True, **kwargs)` in vrne seznam slovarjev:

```python
{
  "site": "siol-nepremicnine",     # stabilen ključ vira (uporablja ga tudi dashboard)
  "status": "prodaja" | "oddaja",  # normalizira se v clean_status()
  "type": "stanovanje, 2-sobno",
  "price": 249000,
  "price_unit": "total" | "per_m2",
  "location": "Ljubljana, Center",
  "area": 58.4,
  "features": ["Letnik: 2005", ...],
  "link": "https://…",             # unikaten, obvezen
  "image": "https://…",
  "novogradnja": False,
  "leto_izgradnje": 2005,
}
```

## Orkestracija

`main.py` → `celoten_zagon_strganja()`:

1. Za `buy in (True, False)` požene vse vire iz `registry.specs(enabled_only=True)` (trenutno 9); vsak vrne `ScrapeResult`, izjema enega vira se zabeleži v `result.error` in ne ustavi cikla. Viri, ki odpovejo, se po koncu cikla pošljejo tudi po e-pošti (če je SMTP nastavljen).
2. `save_to_database()` — najprej validacija (`save_to_database` izloči cene ≤ 0, kraj `N/A`/prazen, prazen link; neobvezno pošlje SMTP poročilo), nato:
   - primarno `psycopg2` + `execute_values` z `ON CONFLICT (link) DO UPDATE`,
   - ob napaki ali brez `SUPABASE_DB_URI` REST API (`/rest/v1/nepremicnine_oglasi`, `on_conflict=link`, batch 100).
3. `popravi_manjkajoce_podatke()` — poišče vrstice brez cene/slike, obnovi iz podstrani; HTTP 404 → `status='potečeno'`.
4. `dnevno_ciscenje_podvojenih_slik()` — odstrani podvojene slike, obdrži najcenejšo vrstico.
5. `schedule`: 05:00 in 17:00; ob zagonu en takojšnji cikel.

Fazi 3 in 4 zahtevata `SUPABASE_DB_URI`; brez nje se preskočita z jasnim sporočilom.

`clean_status(raw)` preslika poljuben zapis v `prodaja` / `oddaja` / `drugo` (ključne besede: prod/offer/nakup, odd/najem/rent; prepozna tudi razmaknjene črke). Implementacija je v `normalizers.normalize_status`.

## Testi

`backend/tests/` teče s `python -m pytest` in **ne** dostopa do omrežja:

- `test_normalizers.py` — slovenski zapisi cen, površin, enot, letnic, statusov in povezav.
- `test_models.py` — pretvorba starega slovarja v `Listing` in nazaj, `is_storable`, `SearchQuery`.
- `test_base_scraper.py` — ponovni poskusi (503 → 200), 404 brez ponovitve, `Retry-After`, izjeme, `pages_fetched`.
- `test_registry.py` — vsak vklopljen vir se da ustvariti, ključi so unikatni, `realinvest` je izklopljen.
- `test_sources.py` — `si21` in `mestonepremicnin` na shranjenih straneh v `tests/fixtures/`.

Mrežni skripti `test_fast.py` in `test_scrapers.py` ostajata za ročno preverjanje živih virov.

## Branje: API routes

- `/api/properties` bere z anon/publishable ključem. `view=home` mapira vrstico v obliko, ki jo pričakuje domov (naslov, sobe, leto, `link`, `site`, cenovna enota). `view=stats` agregira celotno tabelo v kosih po 1000 vrstic (PostgREST omejitev).
- `/api/scraper-health` naredi `head` count po posameznem viru (namesto 1000-vrstičnega seznama) in vrne statistiko za `/dashboard`.

Oba route-a ob napaki vrnejo JSON z `error` in HTTP 500; ob manjkajočih ključih vrne `/api/properties` prazne podatke, da UI ne crasha.

## Predstavitev

- `app/layout.tsx` — server component: metadata, Manrope, `ThemeProvider`, `LanguageProvider`, `Navbar`, `Footer`. Inline skript pred hidracijo nastavi `dark` razred (prepreči "flash").
- `LanguageContext` in `ThemeProvider` — stanje iz `localStorage` prek `useSyncExternalStore`. Strežnik vedno uporabi privzeto vrednost (`sl`, `light`), odjemalec po hidraciji prebere shranjeno izbiro; tako ni `setState` v `useEffect` in ni hidracijskih opozoril.
- `app/page.tsx` — dva fetcha: premium oglasi (`view=home&limit=6&orderBy=weight_desc`) in statistika (`view=stats`). Iskalna kartica sestavi URL parametre (`type`, `location`, `minPrice`, `maxPrice`, `rooms`) in preusmeri na `/search`.
- `app/search/page.tsx` — naloži oglase v straneh po 1000 (`offset`) do izčrpanja, nato filtrira in razvršča **na odjemalcu**. `PAGE_SIZE = 30`, regije iz `REGION_KEYWORDS`, cena/m² iz `price` + `price_unit`.
- ETN prikaz v modalu ni uradni podatek: povprečje €/m² se izračuna iz primerljivih oglasov istega tipa (±40 % površine, vsaj 5 vzorcev). Če vzorcev ni, se prikaže opozorilo.

### Znane omejitve

- Filtriranje in razvrščanje poteka na odjemalcu; ob rasti baze bo treba filtre prenesti v SQL (`/api/properties` z parametri in keyset paginacijo).
- `/admin` in `/dashboard` sta javno dosegljiva in razkrivata statistiko virov — potrebna je zaščita (glej `docs/FUTURE_PLAN.md`).
- `weight` (0–100) se v backendu ne izračunava; pričakuje se, da ga nastavi baza (trigger/backfill). Brez tega vsi oglasi veljajo za `50` in "premium" oznaka (≥ 80) se ne prikaže.
