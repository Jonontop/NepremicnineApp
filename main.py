import json
import psycopg2
from psycopg2.extras import execute_values  # <--- Nujno za hiter bulk insert
from scrapers.abcnepremicnine import AbcScraper
from scrapers.galea import GaleaScraper
from scrapers.si21 import Si21Scraper
from scrapers.siol import SiolScraper
from scrapers.ljubljanaNepremicnine import LjubljanaScraper

# Tvoj pravilno nastavljen povezovalni niz
DB_URI = "postgresql://postgres.adfuejatruobubcjnnqx:NepremicninePortal@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

def save_to_database(listings):
    """Vpiše ali posodobi oglase v Supabase bazi podatkov."""
    if not listings:
        print("\n[!] Ni oglasov za vpis v bazo.")
        return

    # SQL ukaz, ki ob duplikatu URL-ja (link) samo posodobi ceno in čas osvežitve
    query = """
        INSERT INTO nepremicnine_oglasi (site, status, type, price, location, area, features, link, image, posodobljeno_ob)
        VALUES %s
        ON CONFLICT (link) 
        DO UPDATE SET 
            price = EXCLUDED.price,
            posodobljeno_ob = NOW();
    """

    # Pretvorba oglasov v tuple format za psycopg2
    data_to_insert = [
        (
            item['site'],
            item['status'],
            item['type'],
            item['price'],
            item['location'],
            item['area'],
            item['features'],  # Psycopg2 bo Python list avtomatsko pretvoril v PG Array (_text)
            item['link'],
            item['image']
        )
        for item in listings
    ]

    try:
        print(f"\n[↑] Povezujem se s Supabase in vpisujem {len(data_to_insert)} oglasov...")
        conn = psycopg2.connect(DB_URI)
        cur = conn.cursor()
        
        # Izvedba skupinskega vpisa
        execute_values(cur, query, data_to_insert, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
        
        conn.commit()
        cur.close()
        conn.close()
        print("[✓] Podatki so uspešno shranjeni v bazo!")
        
    except Exception as e:
        print(f"[X] Napaka pri vpisu v bazo podatkov: {e}")

def run_all_scrapers():
    scrapers = [
        AbcScraper(), 
        GaleaScraper(),
        Si21Scraper(),
        SiolScraper(),
        LjubljanaScraper()
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

    # <--- TALE KLIC TI JE MANJKAL: Zdaj podatke dejansko pošljemo v bazo!
    save_to_database(all_listings)

if __name__ == "__main__":
    run_all_scrapers()
