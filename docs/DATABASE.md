# Baza podatkov

Projekt uporablja eno tabelo v Supabase (PostgreSQL): `public.nepremicnine_oglasi`. Backend piše z service-role ključem ali neposredno prek `psycopg2`; frontend bere samo z anon/publishable ključem prek PostgREST.

## Stolpci

| Stolpec | Tip | Vir / opombe |
|---------|-----|--------------|
| `id` | `uuid` (PK, privzeto `gen_random_uuid()`) | generira baza |
| `site` | `text` | stabilen ključ vira: `galea`, `si21-nepremicnine`, `siol-nepremicnine`, `ljubljananepremicnine`, `mestonepremicnin`, `abc-nepremicnine`, `insa-nepremicnine`, `simobilia`, `solterra` |
| `status` | `text` | `prodaja`, `oddaja`, `drugo`, `potečeno` |
| `type` | `text` | surov opis tipa iz vira (npr. "stanovanje, 2-sobno") |
| `price` | `numeric` | skupna cena ali cena/m² (glej `price_unit`) |
| `price_unit` | `text` | `total` ali `per_m2` |
| `location` | `text` | surov kraj (npr. "Ljubljana, Center") |
| `area` | `numeric` | površina v m² |
| `features` | `text[]` | dodatne lastnosti, vključno z `Letnik: <leto>` |
| `link` | `text` | **unikaten**, izvorni URL oglasa |
| `image` | `text` | URL naslovne slike |
| `weight` | `integer` | 0–100, kakovost/prioriteta; nastavi jo baza (trigger/backfill) |
| `novogradnja` | `boolean` | novogradnja |
| `leto_izgradnje` | `integer` | leto gradnje |
| `ustvarjeno_ob` | `timestamptz` | `DEFAULT now()` |
| `posodobljeno_ob` | `timestamptz` | backend ga ob upsertu nastavi na `NOW()` |

## Obvezne omejitve

`ON CONFLICT (link)` v `main.py` in REST `on_conflict=link` **zahtevata** unikaten indeks:

```sql
ALTER TABLE public.nepremicnine_oglasi
  ADD CONSTRAINT nepremicnine_oglasi_link_key UNIQUE (link);
```

Brez te omejitve upsert pade in backend ob vsakem ciklu javi napako PostgreSQL, nato poskusi REST (ki prav tako ne uspe).

## Priporočeni indeksi

```sql
CREATE INDEX IF NOT EXISTS idx_oglasi_posodobljeno
  ON public.nepremicnine_oglasi (posodobljeno_ob DESC);

CREATE INDEX IF NOT EXISTS idx_oglasi_weight
  ON public.nepremicnine_oglasi (weight DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_oglasi_site_status
  ON public.nepremicnine_oglasi (site, status);

CREATE INDEX IF NOT EXISTS idx_oglasi_location_lower
  ON public.nepremicnine_oglasi (lower(location));
```

Indeksi `posodobljeno_ob` in `weight` pokrijeta privzeto razvrščanje, `site,status` pa poizvedbe nadzorne plošče.

## `weight` in "premium"

Backend vrednosti `weight` ne pošilja. Frontend jo uporablja tako:

- privzeto razvrščanje: `weight` padajoče, nato `posodobljeno_ob`;
- `weight >= 80` pomeni "premium" (amber obroba in značka);
- če je `weight` `NULL`, UI upošteva `50`.

Zato mora baza vrednost izračunati (trigger pred vstavljanjem/posodobitvijo) ali pa jo je treba občasno backfillati. Primer preprostega trigerja:

```sql
CREATE OR REPLACE FUNCTION public.izracunaj_weight()
RETURNS trigger AS $$
BEGIN
  NEW.weight :=
      (CASE WHEN NEW.image IS NOT NULL AND NEW.image <> '' THEN 40 ELSE 0 END)
    + (CASE WHEN NEW.location IS NOT NULL AND NEW.location <> 'N/A' THEN 25 ELSE 0 END)
    + (CASE WHEN NEW.area IS NOT NULL AND NEW.area > 0 THEN 20 ELSE 0 END)
    + (CASE WHEN NEW.novogradnja THEN 15 ELSE 0 END);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_izracunaj_weight ON public.nepremicnine_oglasi;
CREATE TRIGGER trg_izracunaj_weight
  BEFORE INSERT OR UPDATE ON public.nepremicnine_oglasi
  FOR EACH ROW EXECUTE FUNCTION public.izracunaj_weight();
```

> To je referenčni primer, ne nujno pravilo obstoječe baze. Če je produkcijski `weight` drugačen, trigerja ne ustvarjaj na novo — dokumentiraj obstoječo logiko.

## Referenčna shema (za nov projekt)

Uskladi z dejansko bazo, preden jo uporabiš:

```sql
CREATE TABLE IF NOT EXISTS public.nepremicnine_oglasi (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site             text NOT NULL,
  status           text NOT NULL DEFAULT 'drugo',
  type             text,
  price            numeric,
  price_unit       text NOT NULL DEFAULT 'total',
  location         text,
  area             numeric,
  features         text[] DEFAULT '{}',
  link             text NOT NULL UNIQUE,
  image            text,
  weight           integer,
  novogradnja      boolean NOT NULL DEFAULT false,
  leto_izgradnje   integer,
  ustvarjeno_ob    timestamptz NOT NULL DEFAULT now(),
  posodobljeno_ob  timestamptz NOT NULL DEFAULT now()
);
```

## RLS (Row Level Security)

Frontend bere z javnim ključem, zato mora biti branje dovoljeno, pisanje pa ne:

```sql
ALTER TABLE public.nepremicnine_oglasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "javno branje oglasov"
  ON public.nepremicnine_oglasi
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

Service-role ključ (backend) obide RLS. Ne ustvarjaj `INSERT`/`UPDATE`/`DELETE` politik za `anon`.

## Deduplikacija in "potečeno"

- **Po `link`**: `ON CONFLICT (link) DO UPDATE` osveži ceno, kraj, površino, sliko, leto in `posodobljeno_ob`.
- **Po sliki**: dnevno čiščenje odstrani vrstice z isto sliko in obdrži najcenejšo (`ROW_NUMBER() OVER (PARTITION BY image ORDER BY price ASC)`).
- **Potečeni oglasi**: repair faza ob HTTP 404 nastavi `status='potečeno'`; frontend jih izloči iz štetja aktivnih (`neq('status','potečeno')`), vendar ostanejo v tabeli za zgodovino.

## Vzpostavitev novega Supabase projekta

1. Ustvari projekt in vzemi **Project URL** ter **publishable/anon** ključ.
2. Ustvari tabelo (zgornja referenčna shema) in `UNIQUE (link)`.
3. Dodaj indekse in RLS `SELECT` politiko.
4. Backend: v `backend/.env` vpiši `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` in (za repair/dedupe) `SUPABASE_DB_URI`.
5. Frontend: v `.env.local` vpiši `NEXT_PUBLIC_SUPABASE_URL` in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. Za Cloudflare: `wrangler.jsonc` → `vars` (javna URL + publishable ključ).
7. Poženi `python run_scraper.py` in preveri `GET /api/properties?limit=1`.

> Preverjanje dosegljivosti: projekt, zapisan v trenutnih `.env` datotekah, se iz razvojnega računalnika ne razreši (NXDOMAIN). Pred produkcijskim zagonom preveri, ali je Supabase projekt aktiven in ali se URL ujema.
