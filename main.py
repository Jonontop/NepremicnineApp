import json
from scrapers.abcnepremicnine import AbcScraper
from scrapers.galea import GaleaScraper
from scrapers.si21 import Si21Scraper
from scrapers.siol import SiolScraper
from scrapers.ljubljanaNepremicnine import LjubljanaScraper  # <--- Nov uvoz

def run_all_scrapers():
    scrapers = [
        # AbcScraper(), # Lahko pustiš zakomentirano, če blokada še drži
        GaleaScraper(),
        Si21Scraper(),
        SiolScraper(),
        LjubljanaScraper()  # <--- Dodano v seznam
    ]

    all_listings = []

    print("=========================================")
    print("      ZAGON AGREGATORJA NEPREMIČNIN      ")
    print("=========================================")
    
    for scraper in scrapers:
        print(f"\n[+] Poganjam vir: {scraper.name.upper()}")
        try:
            results = scraper.scrape(limit=2, buy=True, property_type="flat")
            print(f"[✓] {scraper.name} uspešno vrnil {len(results)} oglasov.")
            all_listings.extend(results)
        except Exception as e:
            print(f"[X] Napaka pri izvajanju scraperja {scraper.name}: {e}")

    print("\n=========================================")
    print(f"      PREGLED PODATKOV ({len(all_listings)} oglasov)")
    print("=========================================")
    print(json.dumps(all_listings, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    run_all_scrapers()