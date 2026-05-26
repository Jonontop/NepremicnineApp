import json
import time
import random
import os  # Potrebno za branje sistemskih okoljskih spremenljivk
import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv  # Uvoz knjižnice za .env

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
        links = {row[0] for row in cur.fetchall()}
        cur.close()
        return links
    except Exception as e:
        print(f"[!] Napaka pri branju obstoječih povezav: {e}")
        return set()

def dnevno_ciscenje_podvojenih_slik():
    """Poišče oglase z identičnimi slikami in obdrži tistega z najnižjo ceno."""
    print("\n[+] Začenjam dnevno čiščenje podvojenih slik...")
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
        print(f"[✓] Čiščenje končano. Odstranjenih je bilo {rows_deleted} podvojenih oglasov.")
    except Exception as e:
        print(f"[X] Napaka pri čiščenju podvojenih slik: {e}")

# --- NOVA FUNKCIJA ZA POPRAVILO IN OSVEŽEVANJE PODATKOV ---
def popravi_manjkajoce_podatke():
    """
    Poišče oglase, ki jim manjka cena ali slika, ponovno obišče URL preko
    ustreznega scraperja in posodobi vrstice v bazi podatkov.
    """
    print("\n=========================================")
    print(" 🛠️  ZAGON POPRAVILA MANJKANOČIH PODATKOV ")
    print("=========================================")

    try:
        conn = psycopg2.connect(DB_URI)
        cur = conn.cursor()
        
        # 1. Poiščemo vrstice, kjer je cena 0/NULL ali slika prazna/NULL
        cur.execute("""
            SELECT id, link, site 
            FROM nepremicnine_oglasi 
            WHERE price IS NULL OR price = 0 OR image IS NULL OR image = '';
        """)
        incomplete_listings = cur.fetchall()
        
        if not incomplete_listings:
            print("[✓] Vsi oglasi v bazi imajo izpolnjene kritične podatke!")
            cur.close()
            conn.close()
            return

        print(f"[i] Najdenih {len(incomplete_listings)} nepopolnih oglasov. Začenjam popravilo...")

        # Inicializiramo scraperje, da lahko uporabimo njihove vgrajene metode in headers
        scrapers_pool = {
            "galea": GaleaScraper(),
            "si21": Si21Scraper(),
            "siol": SiolScraper(),
            "ljubljana": LjubljanaScraper(),
            "abc": AbcScraper()
        }

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        for row in incomplete_listings:
            listing_id, link, site = row
            site_key = site.lower().strip()

            print(f"\n[🛠️] Osvežujem oglas #{listing_id} ({site}) -> {link}")

            try:
                # Preverimo status strani
                res = requests.get(link, headers=headers, timeout=10)
                
                # Če oglas vrne 404, pomeni, da je nepremičnina prodana ali umaknjena
                if res.status_code == 404:
                    print(f"    [🗑️] Oglas ne obstaja več (404). Označujem kot 'potečeno'.")
                    cur.execute("UPDATE nepremicnine_oglasi SET status = 'potečeno', posodobljeno_ob = NOW() WHERE id = %s;", (listing_id,))
                    conn.commit()
                    continue

                if res.status_code != 200:
                    print(f"    [!] Strežnik vrnil kodo {res.status_code}, preskakujem.")
                    continue

                soup = BeautifulSoup(res.text, 'html.parser')
                repaired_data = {}

                # Če imava za ta portal pripravljen scraper, pokličeva njegovo metodo za parsin podstrani
                scraper_obj = scrapers_pool.get(site_key)
                if scraper_obj and hasattr(scraper_obj, 'extract_detail_page'):
                    repaired_data = scraper_obj.extract_detail_page(soup)
                else:
                    # Generični fallback na Open Graph meta oznake, če specifična metoda ne obstaja
                    price_meta = soup.find("meta", property="og:price:amount")
                    img_meta = soup.find("meta", property="og:image")
                    
                    if price_meta:
                        repaired_data["price"] = int(''.join(filter(str.isdigit, price_meta["content"])))
                    if img_meta and img_meta["content"]:
                        repaired_data["image"] = img_meta["content"]

                # Očistimo prazne vrednosti iz slovarja
                repaired_data = {k: v for k, v in repaired_data.items() if v}

                if repaired_data:
                    # Dinamično sestavimo UPDATE stavek glede na to, kaj smo našli
                    set_clause = ", ".join([f"{k} = %s" for k in repaired_data.keys()])
                    update_query = f"UPDATE nepremicnine_oglasi SET {set_clause}, posodobljeno_ob = NOW() WHERE id = %s;"
                    
                    params = list(repaired_data.values()) + [listing_id]
                    cur.execute(update_query, params)
                    conn.commit()
                    print(f"    [⚡] Uspešno posodobljeno v PB: {repaired_data}")
                else:
                    print(f"    [~] Ob ponovnem obisku nismo našli manjkajočih podatkov.")

            except Exception as e:
                print(f"    [X] Napaka pri obdelavi povezave: {e}")

            # Ne obremenjujemo portalov preveč
            time.sleep(random.uniform(1.0, 2.5))

        cur.close()
        conn.close()
        print("\n[✓] Popravilo podatkov uspešno zaključeno!")

    except Exception as e:
        print(f"[X] Kritična napaka med izvajanjem popravila: {e}")


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
        (item['site'], clean_status(item['status']), item['type'], item['price'], item['location'], item['area'], item['features'], item['link'], item['image'])
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
    
    try:
        temp_conn = psycopg2.connect(DB_URI)
        existing_links = get_already_scraped_links(temp_conn)
        temp_conn.close()
        print(f"[i] V bazi že obstaja {len(existing_links)} oglasov. Preskočili bomo duplikate.")
    except:
        existing_links = set()
        print("[!] Ni bilo mogoče pred-naložiti obstoječih povezav.")

    for scraper in scrapers:
        print(f"\n[+] Poganjam vir: {scraper.name.upper()}")
        try:
            results = scraper.scrape(limit=5, buy=True, property_type="flat")
            new_results_count = 0
            for item in results:
                if item['link'] in existing_links:
                    continue
                all_listings.append(item)
                new_results_count += 1
            
            print(f"[✓] {scraper.name} vrnil {len(results)} oglasov (od tega {new_results_count} novih).")
            premor = random.uniform(1.5, 3.5)
            time.sleep(premor)
        except Exception as e:
            print(f"[X] Napaka pri izvajanju scraperja {scraper.name}: {e}")

    save_to_database(all_listings)

if __name__ == "__main__":
    # 1. Najprej poženeš klasične scraperje
    run_all_scrapers()
    
    # 2. Takoj za tem preveriš, če imamo kakšne "luknje" v bazi in jih poflikaš
    popravi_manjkajoce_podatke()
    
    # 3. Na koncu počistiš še morebitne podvojene slike
    dnevno_ciscenje_podvojenih_slik()