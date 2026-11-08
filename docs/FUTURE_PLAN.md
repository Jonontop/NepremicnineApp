# Načrt razširitve (roadmap)

Ta dokument opisuje, kam projekt peljati po trenutnem stanju. Vsaka faza ima cilj, konkretne naloge in merilo, kdaj je opravljena. Faze so zaporedne le tam, kjer je odvisnost resnična (npr. analitika potrebuje zgodovino cen); sicer se lahko izvajajo vzporedno.

## Izhodišče (november 2026)

**Deluje:** 9 scraperjev, upsert pipeline, dnevno čiščenje, Next.js frontend z iskalnikom, filtri, regijami, temo in dvojezičnostjo, nadzorna plošča zdravja scraperjev.

**Odprto / tvegano:**

| Tveganje | Vpliv |
|----------|-------|
| Supabase projekt iz `.env` se ne razreši (NXDOMAIN) | ni podatkov, ni testov baze, stran prikazuje prazna stanja |
| `/admin` in `/dashboard` sta javna | razkrita statistika virov in kakovost podatkov |
| Filtriranje in razvrščanje poteka v brskalniku | ob 10.000+ oglasih počasen prvi prikaz |
| Ni CI, ni avtomatskih testov (samo mrežni skripti) | regresije se odkrijejo šele ročno |
| `weight` ni izračunan v kodi | "premium" razvrščanje je odvisno od nevidnega trigerja |
| Ni monitoringa | tiho padli scraper se opazi šele po dnevih |

---

## Faza 0 — Stabilizacija (1 teden)

Cilj: ponovno vzpostaviti zanesljivo bazo in preprečiti tihe okvare.

- [ ] Preveri/obnovi Supabase projekt; uskladi `SUPABASE_*` v `backend/.env`, `.env.local` in `wrangler.jsonc`.
- [ ] Zapis v `docs/DATABASE.md` naj odraža dejansko shemo (trigerji, omejitve, RLS).
- [ ] Zaščiti `/admin` in `/dashboard` (osnovna HTTP Basic ali Supabase Auth + seznam dovoljenih uporabnikov).
- [ ] Rotiraj service-role ključ, če je bil kdaj deljen izven strežnika; preveri, da v repozitoriju ni skrivnosti.
- [ ] Dodaj CI (GitHub Actions): `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `python -m compileall`.
- [ ] Prevedi `test_fast.py` / `test_scrapers.py` v pytest z markerjem `network` (privzeto izklopljeno v CI, ročno pred izdajo).
- [ ] Dodaj strukturirane loge (JSON) in dnevno poročilo: uspeh/neuspeh po viru, št. novih/posodobljenih/potečenih.
- [ ] Monitoring: uptime check `/api/properties` + alarm, če vir ne vrne nič 24 h.

**Merilo:** CI je zelen ob vsakem PR; vsak dnevni cikel pusti sled, iz katere je razvidno, kateri vir je odpovedal.

---

## Faza 1 — Kakovost podatkov (2–3 tedni)

Cilj: manj smeti v bazi in boljša uporabniška izkušnja brez ročnega čiščenja.

- [ ] Skupni modul za validacijo (`backend/validation.py`): tip nepremičnine, smiselna cena glede na tip (zemljišče ≠ stanovanje), površina > 0, leto izgradnje v razponu.
- [ ] Vključi `normalize_locations.py` kot fazo ciklusa (trenutno je ročni skript z dry-run).
- [ ] Fuzzy deduplikacija prek vira: isto jedro oglasa na več portalih (naslov + kraj + površina ±2 m² + cena ±2 %) → en "master" oglas z več viri.
- [ ] Življenjski cikel oglasa: `prvič_videno`, `zadnjič_videno`, `potečeno_ob`; oglas postane `potečeno` po N neuspešnih ciklih, ne takoj ob 404 (začasne napake).
- [ ] Zgodovina kakovosti: tabela `scraper_runs` (vir, začetek, trajanje, najdeno, shranjeno, napake) — podlaga za graf na dashboardu.
- [ ] Retry z exponential backoff za HTTP 429/5xx; spoštuj `Retry-After`; ob 403 začasno ustavi vir za 24 h.
- [ ] Pravna preveritev: `robots.txt`, pogoji uporabe virov, navedba vira pri vsakem oglasu (že prisotna).

**Merilo:** delež oglasov brez cene/slike pade pod 2 %; podvojene slike < 0,5 %; vsak scraper ima vidno zgodovino uspešnosti.

---

## Faza 2 — Pokritost virov (stalna aktivnost)

Cilj: več oglasov in manj slepih peg, brez podvajanja dela.

- [ ] `realinvest.py` validiraj na vzorcu 50 oglasov (cena, kraj, površina, link) in šele nato dodaj v `main.py` + `run_scraper.py`.
- [ ] Vključi vire iz `frontend/TODO.md`, po prioriteti: novogradnje.com (novogradnja=true), c21.si, stan.si, 24nep.si, urbanistika.si, k2finance.si, mreza.com.
- [ ] Vsak nov vir = nova datoteka + vrstica v `KNOWN_SITES` (`/api/scraper-health`) + vnos v README tabelo.
- [ ] Za WordPress/Joomla agencije uporabi `wordpress_api.py` oz. `agency_scraper.py` z `AgencyConfig` namesto kopiranja kode.
- [ ] Letni "scraper audit": preveri DOM selektorje (portali jih menjajo brez najave) in posodobi teste.

**Merilo:** vsaj 3 novi viri v produkciji, vsak z > 20 oglasi in < 5 % napak pri validaciji.

---

## Faza 3 — Iskanje in uporabniška izkušnja (3–4 tedni)

Cilj: iskanje, ki ostane hitro pri 50.000 oglasih, in uporabniški tok brez presenečenj.

- [ ] Prenesi filtriranje v SQL: `/api/properties` sprejme `q`, `action`, `typeGroup`, `location`, `rooms`, `minPrice`, `maxPrice`, `sort`, `page`; uporabi `LIMIT/OFFSET` ali keyset paginacijo.
- [ ] Postgres `pg_trgm` + `tsvector` indeks za iskanje po kraju/naslovu; `EXPLAIN ANALYZE` pred/po.
- [ ] Fasetni števci (koliko zadetkov po tipu/regiji) iz ene agregacijske poizvedbe.
- [ ] Ohrani parametre v URL (deljive povezave) in sinhroniziraj filtre z `router.replace`.
- [ ] Shranjena iskanja in "nazaj na rezultate" (ohrani stran/scroll).
- [ ] Zemljevid: marker clustering + približna lokacija (centroid občine), brez natančnega naslova.
- [ ] Primerjava 2–4 oglasov (tabela atributov, €/m²).
- [ ] Skeleton loading namesto polnozaslonskega spinnerja; ohrani rezultate ob menjavi filtra.
- [ ] Dostopnost (WCAG 2.1 AA): fokus, `aria-*`, kontrast, tipkovnica v modalu.

**Merilo:** prvi prikaz rezultatov < 1 s na 4G za 10.000 oglasov; Lighthouse Performance ≥ 90 na `/search`.

---

## Faza 4 — Uporabniki (3–5 tednov)

Cilj: ponovni obisk in zadržanje uporabnikov.

- [ ] Avtentikacija (Supabase Auth ali enakovreden ponudnik) — samo e-pošta/Google, brez gesel, če se da.
- [ ] Priljubljeni oglasi v bazi (trenutno samo `useState` na domov) + sinhronizacija med napravami.
- [ ] Shranjena iskanja + e-poštna obvestila ob novih zadetkih.
- [ ] Obvestilo o padcu cene (zahteva zgodovino cen iz Faze 5).
- [ ] Uporabniški profil in izbris računa (GDPR: izvoz in izbris podatkov).
- [ ] Anti-spam in omejitve (rate limit na API route).

**Merilo:** registriran uporabnik lahko shrani iskanje in prejme vsaj eno pravilno obvestilo; izbris računa odstrani vse osebne podatke.

---

## Faza 5 — Analitika trga (4–6 tednov)

Cilj: iz agregatorja v analitično orodje — to je glavna razlikovalna prednost.

- [ ] Tabela `price_history` (`listing_id`, `price`, `seen_at`, `price_unit`) — polni se ob vsakem upsertu, ko se cena spremeni.
- [ ] Tabela `sellers` / `agencies` (iz `TODO.md`): naziv, telefon, e-pošta, spletna stran; `listing.seller_id`.
- [ ] Izračuni: mediana €/m² po občini/regiji/tipu, trend 30/90/365 dni, ponudba (št. aktivnih oglasov) in povprečni čas do prodaje (če je razvidno).
- [ ] Grafi: cenovni trend, distribucija €/m², primerjava regij; podatke pripravi API (`/api/market`), ne brskalnik.
- [ ] ETN/GURS: če ostane ocena, jo jasno označi kot oceno; za uradne podatke potrebujemo vir in licenco.
- [ ] Javni "market report" (mesečni PDF/stran) kot vsebinski magnet.

**Merilo:** za vsako regijo in tip obstaja vsaj 30-dnevni trend z opombo o velikosti vzorca; številke so ponovljive iz SQL poizvedbe.

---

## Faza 6 — Monetizacija (kasneje)

- [ ] Izpostavljeni oglasi (sponzorirano, jasno označeno) za agencije.
- [ ] Paketi za agencije: profil agencije, logotip, kontakt, statistika ogledov.
- [ ] Prednostno posredovanje povpraševanj (lead gen) z jasnim soglasjem uporabnika.
- [ ] Affiliate povezave do ponudnikov storitev (krediti, selitve, zavarovanje) — brez vpliva na razvrščanje.
- [ ] Plačljiv API za medije/analitike (že obstoječa shema + kvote).

**Merilo:** sponzorirani oglasi so vizualno ločeni in ne vplivajo na organsko razvrstitev; vsak prihodek ima merljiv izvor.

---

## Faza 7 — Platforma in operacije (vzporedno)

- [ ] Vklopi R2 incremental cache v `open-next.config.ts` in preveri ISR na Cloudflare.
- [ ] Okolja: preview/staging/produkcija z ločenimi Supabase projekti in ključi.
- [ ] Varnostne kopije baze (dnevni snapshot, mesečni arhiv, preizkus obnove).
- [ ] Strukturirani logi + metrike (scraper trajanje, napake po viru, API latenca) in alarmi.
- [ ] SEO: `sitemap.ts`, `robots.ts`, JSON-LD (`RealEstateListing`), `hreflang` za SL/EN, Open Graph slike.
- [ ] i18n prek `next-intl` (trenutno so prevodi ročno v vsaki strani) in `lang` atribut glede na izbiro.
- [ ] Prenos v `lib/` za skupne tipe in helperje (trenutno podvojeni med API route in stranmi).
- [ ] Load test (k6) na `/api/properties` in `/search`.

---

## Prioritetna matrika (naslednjih 6 tednov)

| Naloga | Vpliv | Napor | Prioriteta |
|--------|-------|-------|------------|
| Obnova/preverjanje baze | kritično | nizko | 1 |
| Zaščita `/admin` + `/dashboard` | visoko | nizko | 2 |
| CI + pytest | visoko | srednje | 3 |
| Server-side filtriranje in paginacija | visoko | visoko | 4 |
| `scraper_runs` + dnevno poročilo | srednje | nizko | 5 |
| Fuzzy deduplikacija | srednje | visoko | 6 |
| `price_history` + trendi | visoko | srednje | 7 |
| Avtentikacija + priljubljeni | srednje | visoko | 8 |

## Predlog naslednjih treh sprintov

1. **Sprint 1:** baza + zaščita admina + CI (Faza 0).
2. **Sprint 2:** validacija, `scraper_runs`, retry/backoff, vklop `normalize_locations` (Faza 1).
3. **Sprint 3:** server-side iskanje in paginacija + fasetni števci (Faza 3, prvi del).

Vsaka faza se zaključi z enim dokumentiranim merilom; če merilo ni doseženo, se faza ne označi kot končana.
