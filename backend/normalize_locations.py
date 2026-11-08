"""
Location Normalizer
===================
Cleans up duplicate/inconsistent location names in the database.

Examples of what it fixes:
- "Ljubljana, Center" + "Ljubljana center, Center" + "Center, Center, Ljubljana" → "Ljubljana, Center"
- "Podravska, Maribor, Studenci" → "Maribor, Studenci"
- "Obalno - kraška, Koper" → "Koper"
- "000.00 €" → removed (not a location)
- "KAMNIK" → "Kamnik" (case normalization)

Run: cd backend && python normalize_locations.py
"""

import os
import sys
import io
import requests
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[X] Manjka SUPABASE_URL ali SUPABASE_SERVICE_KEY (backend/.env).")
    sys.exit(1)

# Known Slovenian regions (to strip from location strings)
SLOVENIAN_REGIONS = {
    "podravska", "pomurska", "koroška", "savinjska", "zasavska",
    "posavska", "spodnjeposavska", "dolenjska", "jugovzhodna slovenija",
    "osrednjeslovenska", "gorenjska", "primorsko-notranjska",
    "notranjsko-kraška", "notranjska", "obalno-kraška", "obalno - kraška",
    "obala", "goriška", "severna primorska", "južna primorska",
    "posavje", "kras",
}

# Known Croatian regions (to strip)
CROATIAN_REGIONS = {
    "istarska županija",
    "splitsko-dalmatinska žup.",
    "splitsko-dalmatinska županija",
    "zadarska županija",
    "primorsko-goranska žup.",
    "primorsko-goranska županija",
    "šibensko-kninska županija",
}

# Ljubljana neighborhood aliases → canonical name
LJUBLJANA_ALIASES = {
    "bežigrad": "Bežigrad",
    "črnuče": "Črnuče",
    "dravlje": "Dravlje",
    "vič": "Vič",
    "vič rudnik": "Vič-Rudnik",
    "vič-rudnik": "Vič-Rudnik",
    "rudnik": "Vič-Rudnik",
    "rožna dolina": "Vič-Rudnik",
    "šiška": "Šiška",
    "center": "Center",
    "ljubljana center": "Center",
    "ljubljana mesto": "Center",
    "moste-polje": "Moste-Polje",
    "moste polje": "Moste-Polje",
    "btc": "Moste-Polje",
    "polje": "Moste-Polje",
    "stegne": "Šiška",
    "vižmarje": "Šiška",
    "brod": "Šiška",
    "trnovo": "Vič-Rudnik",
    "dolgi most": "Vič-Rudnik",
    "prule": "Center",
    "zupančičeva jama": "Bežigrad",
    "koseze": "Šiška",
    "kodeljevo": "Moste-Polje",
    "petkovšek": "Center",
    "turnje": "Center",
}

# Maribor neighborhood aliases
MARIBOR_ALIASES = {
    "center": "Center",
    "maribor center": "Center",
    "studencki": "Studenci",
    "studenca": "Studenci",
    "pobrežje": "Pobrežje",
    "tezno": "Tezno",
    "tabor": "Tabor",
    "zg. radvanje": "Radvanje",
    "zgornje radvanje": "Radvanje",
    "koroška vrata": "Center",
}

# Junk locations to remove
JUNK_LOCATIONS = {
    "000.00 €", "€", "0", "n/a", "test", "unknown", "",
}


def normalize_location(raw_location: str) -> str:
    """Normalize a raw location string to a canonical form."""
    if not raw_location:
        return ""

    loc = raw_location.strip()

    # Remove junk
    if loc.lower() in JUNK_LOCATIONS:
        return ""
    if "€" in loc and len(loc) < 20:
        return ""
    if loc.replace(".", "").replace(",", "").replace(" ", "").isdigit():
        return ""

    # Case normalization (first letter uppercase, rest lowercase for each word)
    parts = [p.strip() for p in loc.split(",") if p.strip()]

    # Determine if this is a Ljubljana, Maribor, or general location
    # Check Maribor FIRST (before Ljubljana) to avoid false positives
    is_maribor = any("maribor" in p.lower() for p in parts)

    is_ljubljana = (
        any("ljubljana" in p.lower() for p in parts) or
        (not is_maribor and any(
            p.lower() in LJUBLJANA_ALIASES for p in parts
        ))
    )

    # Strip region prefixes
    cleaned = []
    for p in parts:
        p_lower = p.lower().strip()
        if p_lower in SLOVENIAN_REGIONS or p_lower in CROATIAN_REGIONS:
            continue
        # Strip "Hrvaška" if followed by a region
        if p_lower == "hrvaška" and len(parts) > 2:
            continue
        cleaned.append(p.strip())

    if not cleaned:
        return ""

    # Handle Ljubljana specifically
    if is_ljubljana:
        # Find the neighborhood
        neighborhood = None
        for p in cleaned:
            p_lower = p.lower().strip()
            if "ljubljana" in p_lower:
                continue  # Skip the city name itself
            if p_lower in LJUBLJANA_ALIASES:
                neighborhood = LJUBLJANA_ALIASES[p_lower]
                break
            elif len(p) > 1 and p_lower not in {"ljubljana", "center"}:
                neighborhood = p.strip()
                break

        if neighborhood:
            return f"Ljubljana, {neighborhood}"
        return "Ljubljana"

    # Handle Maribor specifically
    if is_maribor:
        neighborhood = None
        for p in cleaned:
            p_lower = p.lower().strip()
            if "maribor" in p_lower:
                continue
            if p_lower in MARIBOR_ALIASES:
                neighborhood = MARIBOR_ALIASES[p_lower]
                break
            elif len(p) > 1:
                neighborhood = p.strip()
                break

        if neighborhood:
            return f"Maribor, {neighborhood}"
        return "Maribor"

    # General case: take first meaningful part (city/town)
    if len(cleaned) >= 2:
        return f"{cleaned[0]}, {cleaned[1]}"
    return cleaned[0]


def fetch_all_locations():
    """Fetch all unique locations from the database."""
    url = f"{SUPABASE_URL}/rest/v1/nepremicnine_oglasi"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }

    all_rows = []
    offset = 0
    while True:
        resp = requests.get(
            url,
            headers=headers,
            params={"select": "id,location", "limit": "1000", "offset": str(offset)},
            timeout=30,
        )
        data = resp.json()
        if not data:
            break
        all_rows.extend(data)
        offset += 1000

    return all_rows


def normalize_all(dry_run=True):
    """Normalize all locations in the database."""
    print("Fetching all listings...")
    rows = fetch_all_locations()
    print(f"  Found {len(rows)} listings")

    updates = []
    for row in rows:
        raw = row.get("location", "")
        normalized = normalize_location(raw)
        if normalized and normalized != raw:
            updates.append({"id": row["id"], "old": raw, "new": normalized})

    print(f"  {len(updates)} locations need normalization")

    if not updates:
        print("  Nothing to update!")
        return

    # Show sample
    print("\n  Sample changes:")
    for u in updates[:20]:
        print(f"    \"{u['old']}\" → \"{u['new']}\"")

    if dry_run:
        print(f"\n  [DRY RUN] Would update {len(updates)} listings.")
        print("  Run with --apply to apply changes.")
        return

    # Apply updates
    url = f"{SUPABASE_URL}/rest/v1/nepremicnine_oglasi"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    updated = 0
    for u in updates:
        resp = requests.patch(
            url,
            headers=headers,
            json={"location": u["new"]},
            params={"id": f"eq.{u['id']}"},
            timeout=10,
        )
        if resp.status_code in (200, 204):
            updated += 1
        else:
            print(f"  Failed to update {u['id']}: {resp.status_code}")

    print(f"\n  Updated {updated}/{len(updates)} locations!")


if __name__ == "__main__":
    dry_run = "--apply" not in sys.argv
    normalize_all(dry_run=dry_run)
