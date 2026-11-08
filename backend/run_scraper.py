"""
Polni zagon scraperjev z REST API pisanjem v bazo.
Zaženi: cd backend && python run_scraper.py
"""
import sys
import io
import os
import time
import json
import requests
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

from scrapers.abcnepremicnine import AbcScraper
from scrapers.galea import GaleaScraper
from scrapers.si21 import Si21Scraper
from scrapers.mestonepremicnin import MestoScraper
from scrapers.siol import SiolScraper
from scrapers.ljubljanaNepremicnine import LjubljanaScraper
from scrapers.insa import InsaScraper
from scrapers.simobilia import SimobiliaScraper
from scrapers.solterra import SolTerraScraper


def clean_status(raw_status):
    if not raw_status:
        return "drugo"
    s = str(raw_status).lower().strip()
    if "prod" in s or "offer" in s or "nakup" in s:
        return "prodaja"
    elif "odd" in s or "najem" in s or "rent" in s:
        return "oddaja"
    return "drugo"


def save_batch(listings):
    """Save listings to Supabase via REST API in batches of 100."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[X] No SUPABASE_URL or SUPABASE_SERVICE_KEY!")
        return 0

    url = f"{SUPABASE_URL}/rest/v1/nepremicnine_oglasi"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    # Validate and prepare rows
    rows = []
    for item in listings:
        price = item.get("price", 0)
        location = item.get("location", "")
        link = item.get("link", "")
        if not price or price <= 0 or not location or location == "N/A" or not link:
            continue
        rows.append({
            "site": item["site"],
            "status": clean_status(item["status"]),
            "type": item["type"],
            "price": price,
            "price_unit": item.get("price_unit", "total"),
            "location": location,
            "area": item.get("area", 0),
            "features": item.get("features", []),
            "link": link,
            "image": item.get("image", ""),
            "novogradnja": item.get("novogradnja", False),
            "leto_izgradnje": item.get("leto_izgradnje"),
        })

    if not rows:
        return 0

    total_saved = 0
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            resp = requests.post(
                url,
                headers=headers,
                json=batch,
                params={"on_conflict": "link"},
                timeout=30,
            )
            if resp.status_code in (200, 201):
                total_saved += len(batch)
            else:
                print(f"  [X] REST API error ({resp.status_code}): {resp.text[:200]}")
        except Exception as e:
            print(f"  [X] REST API exception: {e}")

    return total_saved


def main():
    scrapers = [
        ("SIOL", SiolScraper()),
        ("MESTO", MestoScraper()),
        ("LJUBLJANA", LjubljanaScraper()),
        ("ABC", AbcScraper()),
        ("GALEA", GaleaScraper()),
        ("SI21", Si21Scraper()),
        ("INSA", InsaScraper()),
        ("SIMOBILIA", SimobiliaScraper()),
        ("SOLTERRA", SolTerraScraper()),
    ]

    grand_total = 0
    grand_saved = 0
    t_start = time.time()

    for buy in [True, False]:
        mode = "PRODAJA" if buy else "ODDAJA"
        print(f"\n{'='*50}")
        print(f"  {mode}")
        print(f"{'='*50}")

        for name, scraper in scrapers:
            print(f"\n[+] {name} ({mode})")
            t0 = time.time()
            try:
                results = scraper.scrape(buy=buy)
                elapsed = time.time() - t0
                print(f"  Scraped {len(results)} listings in {elapsed:.0f}s")

                saved = save_batch(results)
                grand_total += len(results)
                grand_saved += saved
                print(f"  Saved {saved} to database")
            except Exception as e:
                print(f"  [X] Error: {e}")

            time.sleep(1)

    elapsed_total = time.time() - t_start
    print(f"\n{'='*50}")
    print(f"  ZAKLJUČEK")
    print(f"{'='*50}")
    print(f"  Total scraped: {grand_total}")
    print(f"  Total saved:   {grand_saved}")
    print(f"  Time:          {elapsed_total/60:.1f} minutes")


if __name__ == "__main__":
    main()
