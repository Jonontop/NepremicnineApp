# nepremicnine-portal — Next.js frontend (vesta.si)

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4. Aplikacija bere oglase iz Supabase prek lastnih API route-ov in jih prikaže v dvojezičnem (SL/EN) vmesniku s svetlo/temno temo.

## Zagon

```bash
npm ci
cp .env.example .env.local     # NEXT_PUBLIC_SUPABASE_URL + publishable ali anon ključ
npm run dev                    # http://localhost:3000
```

Brez nastavljenih ključev aplikacija dela, vendar prikaže prazna stanja (API vrne prazne rezultate).

## Ukazi

| Ukaz | Namen |
|------|-------|
| `npm run dev` | razvojni strežnik (Turbopack) |
| `npm run build` | produkcijska gradnja |
| `npm start` | zagon zgrajene aplikacije |
| `npm run lint` | ESLint (brez opozoril) |
| `npm run preview` | OpenNext build + lokalni Cloudflare preview |
| `npm run deploy` | OpenNext build + deploy na Cloudflare |

## Struktura

```
app/
├── layout.tsx              # metadata, Manrope, ThemeProvider, LanguageProvider, Navbar, Footer
├── page.tsx                # domov
├── search/page.tsx         # iskalnik (filtri, pager, modal)
├── about|faq|tos|privacy/  # vsebinske strani
├── admin/page.tsx          # nadzorna plošča (javna — glej opozorilo)
├── dashboard/page.tsx      # ista vsebina kot /admin
├── LanguageContext.tsx     # SL/EN prek useSyncExternalStore + localStorage
├── ThemeProvider.tsx       # dark/light prek useSyncExternalStore + localStorage
└── api/
    ├── properties/route.ts       # GET oglasi: raw | home | stats
    └── scraper-health/route.ts   # GET statistika virov
```

## API

`GET /api/properties?limit=50&offset=0&orderBy=weight_desc&view=raw`

- `limit` 1–1000, `offset` za paging (PostgREST omejitev 1000 vrstic),
- `view`: `raw` (surove vrstice), `home` (oblika za domov, vključno z `link` in `site`), `stats` (agregati celotne tabele).

`GET /api/scraper-health` — skupni števci, statistika po viru in kakovost podatkov.

## Tema in jezik

Oba providerja uporabljata `useSyncExternalStore`: strežnik vedno uporabi privzeto vrednost (`sl`, `light`), odjemalec po hidraciji prebere `localStorage`. Inline skript v `layout.tsx` nastavi `dark` razred pred hidracijo, da ni utripanja.

## Deploy

```bash
npm run deploy   # OpenNext + Cloudflare Workers (wrangler.jsonc)
```

`wrangler.jsonc` vsebuje samo javne `NEXT_PUBLIC_*` vrednosti. Service-role ključ ne sme priti v frontend.

## Opozorila

- `/admin` in `/dashboard` nista zaščitena — ne objavljajta ju, dokler ni dodane avtentikacije.
- Iskanje filtrira na odjemalcu in naloži do 10.000 vrstic; ob rasti baze je treba filtre prenesti v SQL.
