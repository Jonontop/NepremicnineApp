import json
import time
import random
import os  # <--- Potrebno za branje sistemskih okoljskih spremenljivk
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv  # <--- Uvoz knjižnice za .env

# Skrbi za uvoze tvojih scraperjev...
from scrapers.abcnepremicnine import AbcScraper
from scrapers.galea import GaleaScraper
from scrapers.si21 import Si21Scraper
from scrapers.siol import SiolScraper
from scrapers.ljubljanaNepremicnine import LjubljanaScraper

# [Naloži spremenljivke iz .env datoteke]
load_dotenv()

# [Preberi URI iz .env datoteke]
DB_URI = os.getenv("SUPABASE_DB_URI")

# Če si ponesreči pozabil ustvariti .env ali pa je prazna, nas program opozori
if not DB_URI:
    raise ValueError("[X] Napaka: SUPABASE_DB_URI ni nastavljen v .env datoteki!")

def clean_status(raw_status):
    """Pretvori poljubne statuse portalov v enotno vrednost 'prodaja' ali 'oddaja'."""
    if not raw_status:
        return "drugo"
    
    status_clean = str(raw_status).lower().strip()
    
    if "prod" in status_clean or "offer" in status_clean or "nakup" in status_clean:
        return "prodaja"
    elif "odd" in status_clean or "najem" in status_clean or "rent" in status_clean:
        return "oddaja"
    
    return "drugo"

def get_already_scraped_links(conn):
    """Pobere vse obstoječe URL-je iz baze, da preprečimo odvečno obdelavo."""
    try:
        cur = conn.cursor()
        cur.execute("SELECT link FROM nepremicnine_oglasi;")
        # Shranimo v 'set', ker je preverjanje 'if link in obstojeci' v setu ekstremno hitro (O(1))
        links = {row[0] for row in cur.fetchall()}
        cur.close()
        return links
    except Exception as e:
        print(f"[!] Napaka pri branju obstoječih povezav: {e}")
        return set()
    

def dnevno_ciscenje_podvojenih_slik():
    """
    Poišče oglase z identičnimi slikami (ki niso prazne) 
    in obdrži samo tistega z najnižjo ceno (ali najnovejšega).
    """
    print("\n[+] Začenjam dnevno čiščenje podvojenih slik...")
    
    # SQL, ki najde slike z več kot enim oglasom, izbere najcenejšega (ali najnovejšega),
    # ostale ID-je pa izbriše.
    delete_query = """
        WITH podvojene_slike AS (
            SELECT id, image, price,
                   ROW_NUMBER() OVER(PARTITION BY image ORDER BY price ASC, posodobljeno_ob DESC) as rn
            FROM nepremicnine_oglasi
            WHERE image IS NOT NULL AND image != ''
        )
        DELETE FROM nepremicnine_oglasi
        WHERE id IN (
            SELECT id FROM podvojene_slike WHERE rn > 1
        );
    """
    
    try:
        conn = psycopg2.connect(DB_URI)
        cur = conn.cursor()
        cur.execute(delete_query)
        rows_deleted = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        print(f"[✓] Čiščenje končano. Odstranjenih je bilo {rows_deleted} podvojenih oglasov glede na sliko.")
    except Exception as e:
        print(f"[X] Napaka pri čiščenju podvojenih slik: {e}")
        

def save_to_database(listings):
    """Vpiše nove oglase ali posodobi obstoječe ob spremembi cene."""
    if not listings:
        print("\n[!] Ni novih oglasov za vpis v bazo.")
        return

    query = """
        INSERT INTO nepremicnine_oglasi (site, status, type, price, location, area, features, link, image, posodobljeno_ob)
        VALUES %s
        ON CONFLICT (link) 
        DO UPDATE SET 
            price = EXCLUDED.price,
            posodobljeno_ob = NOW();
    """

    data_to_insert = [
        (
            item['site'],
            clean_status(item['status']),  # <--- Tukaj dokončno poenotimo status pred vpisom
            item['type'],
            item['price'],
            item['location'],
            item['area'],
            item['features'],
            item['link'],
            item['image']
        )
        for item in listings
    ]

    try:
        print(f"\n[↑] Povezujem se s Supabase in vpisujem {len(data_to_insert)} oglasov...")
        conn = psycopg2.connect(DB_URI)
        cur = conn.cursor()
        execute_values(cur, query, data_to_insert, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
        conn.commit()
        cur.close()
        conn.close()
        print("[✓] Podatki so uspešno shranjeni v bazo!")
    except Exception as e:
        print(f"[X] Napaka pri vpisu v bazo podatkov: {e}")

def run_all_scrapers():
    scrapers = [
        GaleaScraper(),
        Si21Scraper(),
        SiolScraper(),
        LjubljanaScraper()
    ]

    all_listings = []

    print("=========================================")
    print("      ZAGON AGREGATORJA NEPREMIČNIN      ")
    print("=========================================")
    
    # Odpremo začasno povezavo samo zato, da vidimo, kaj že imamo v PB
    try:
        temp_conn = psycopg2.connect(DB_URI)
        existing_links = get_already_scraped_links(temp_conn)
        temp_conn.close()
        print(f"[i] V bazi že obstaja {len(existing_links)} oglasov. Preskočili bomo duplikate.")
    except:
        existing_links = set()
        print("[!] Ni bilo mogoče pred-naložiti obstoječih povezav. Delam brez de-duplikacije v Pythonu.")

    for scraper in scrapers:
        print(f"\n[+] Poganjam vir: {scraper.name.upper()}")
        try:
            # Tukaj scraper vrne surove podatke (limit=10 ali več za produkcijo)
            results = scraper.scrape(limit=5, buy=True, property_type="flat")
            
            new_results_count = 0
            for item in results:
                # Točka 1: Preverjanje, če je oglas ŽE v PB (v Pythonu pred vpisom)
                if item['link'] in existing_links:
                    # Lahko bi ga vseeno dodal, če se spremeni cena (SQL ON CONFLICT to reši),
                    # ampak s tem ko ga filtriraš že tukaj, prihraniš bazi delo.
                    continue
                
                all_listings.append(item)
                new_results_count += 1
            
            print(f"[✓] {scraper.name} vrnil {len(results)} oglasov (od tega {new_results_count} popolnoma novih).")
            
            # Točka 2: Pametni časovni zamik med scraperji, da ne delamo panike na omrežju
            premor = random.uniform(1.5, 3.5)
            print(f"[~] Premor {premor:.2f} s za simulacijo človeškega klikanja...")
            time.sleep(premor)

        except Exception as e:
            print(f"[X] Napaka pri izvajanju scraperja {scraper.name}: {e}")

    # Shranjevanje prečiščenih oglasov
    save_to_database(all_listings)

if __name__ == "__main__":
    run_all_scrapers()