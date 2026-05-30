import json
import time
import random
import os
import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import schedule  # Knjižnica za časovnike

# Uvozi tvoje scraperje
from scrapers.abcnepremicnine import AbcScraper
from scrapers.galea import GaleaScraper
from scrapers.si21 import Si21Scraper
from scrapers.siol import SiolScraper
from scrapers.ljubljanaNepremicnine import LjubljanaScraper

# Naloži okoljske spremenljivke
load_dotenv()
DB_URI = os.getenv("SUPABASE_DB_URI")

if not DB_URI:
    raise ValueError("[X] Napaka: SUPABASE_DB_URI ni nastavljen v .env datoteki!")

def clean_status(raw_status):
    if not raw_status:
        return "drugo"
    status_clean = str(raw_status).lower().strip()
    if "prod" in status_clean or "offer" in status_clean or "nakup" in status_clean:
        return "prodaja"
    elif "odd" in status_clean or "najem" in status_clean or "rent" in status_clean:
        return "oddaja"
    return "drugo"

def dnevno_ciscenje_podvojenih_slik():
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

def popravi_manjkajoce_podatke():
    print("\n=========================================")
    print(" 🛠️  ZAGON POPRAVILA MANJKANOČIH PODATKOV ")
    print("=========================================")
    try:
        conn = psycopg2.connect(DB_URI)
        cur = conn.cursor()
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

        scrapers_pool = {
            "galea": GaleaScraper(),
            "si21": Si21Scraper(),
            "siol": SiolScraper(),
            "ljubljana": LjubljanaScraper(),
            "abc": AbcScraper()
        }
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

        for row in incomplete_listings:
            listing_id, link, site = row
            site_key = site.lower().strip()
            print(f"[🛠️] Osvežujem oglas #{listing_id} ({site}) -> {link}")
            try:
                res = requests.get(link, headers=headers, timeout=10)
                if res.status_code == 404:
                    print(f"    [🗑️] Oglas ne obstaja več (404). Označujem kot 'potečeno'.")
                    cur.execute("UPDATE nepremicnine_oglasi SET status = 'potečeno', posodobljeno_ob = NOW() WHERE id = %s;", (listing_id,))
                    conn.commit()
                    continue

                if res.status_code != 200:
                    continue

                soup = BeautifulSoup(res.text, 'html.parser')
                repaired_data = {}
                scraper_obj = scrapers_pool.get(site_key)
                
                if scraper_obj and hasattr(scraper_obj, 'extract_detail_page'):
                    repaired_data = scraper_obj.extract_detail_page(soup)
                else:
                    price_meta = soup.find("meta", property="og:price:amount")
                    img_meta = soup.find("meta", property="og:image")
                    if price_meta:
                        repaired_data["price"] = int(''.join(filter(str.isdigit, price_meta["content"])))
                    if img_meta and img_meta["content"]:
                        repaired_data["image"] = img_meta["content"]

                repaired_data = {k: v for k, v in repaired_data.items() if v}
                if repaired_data:
                    set_clause = ", ".join([f"{k} = %s" for k in repaired_data.keys()])
                    update_query = f"UPDATE nepremicnine_oglasi SET {set_clause}, posodobljeno_ob = NOW() WHERE id = %s;"
                    cur.execute(update_query, list(repaired_data.values()) + [listing_id])
                    conn.commit()
                    print(f"    [⚡] Uspešno posodobljeno v PB: {repaired_data}")
            except Exception as e:
                print(f"    [X] Napaka pri obdelavi povezave: {e}")
            time.sleep(random.uniform(1.0, 2.5))

        cur.close()
        conn.close()
    except Exception as e:
        print(f"[X] Kritična napaka med izvajanjem popravila: {e}")

def send_admin_email(subject, body):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    admin_email = os.getenv("ADMIN_EMAIL", "podpora@smartnepremicnine.si")

    # If SMTP settings are not provided, we log it and skip sending
    if not all([smtp_host, smtp_port, smtp_user, smtp_pass]):
        print(f"[✉️ Admin Report] (SMTP not configured) Subject: {subject}\nBody: {body}")
        return

    import smtplib
    from email.mime.text import MIMEText
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = admin_email

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"[✓] Poročilo uspešno poslano administratorju na {admin_email}.")
    except Exception as e:
        print(f"[X] Napaka pri pošiljanju poročila administratorju: {e}")

def save_to_database(listings):
    if not listings:
        print("\n[!] Ni novih oglasov za vpis v bazo.")
        return

    valid_listings = []
    for item in listings:
        price = item.get('price')
        location = item.get('location')
        link = item.get('link')
        site = item.get('site')
        
        if not price or price <= 0 or not location or location == "N/A" or not location.strip():
            reason = []
            if not price or price <= 0:
                reason.append("cena je n/a ali 0")
            if not location or location == "N/A" or not location.strip():
                reason.append("kraj je n/a")
            
            reason_str = ", ".join(reason)
            subject = f"Neveljaven oglas izločen: {site}"
            body = f"Oglas na povezavi {link} je bil izločen.\nRazlog: {reason_str}.\n\nPodrobnosti:\n{json.dumps(item, indent=2, default=str)}"
            send_admin_email(subject, body)
            continue
        
        valid_listings.append(item)

    if not valid_listings:
        print("\n[!] Ni veljavnih oglasov za vpis v bazo.")
        return

    query = """
        INSERT INTO nepremicnine_oglasi (
            site, status, type, price, price_unit, location, area, features,
            link, image, novogradnja, leto_izgradnje, posodobljeno_ob
        )
        VALUES %s
        ON CONFLICT (link) 
        DO UPDATE SET 
            price = EXCLUDED.price,
            price_unit = EXCLUDED.price_unit,
            location = EXCLUDED.location,
            area = EXCLUDED.area,
            features = EXCLUDED.features,
            image = EXCLUDED.image,
            novogradnja = EXCLUDED.novogradnja,
            leto_izgradnje = EXCLUDED.leto_izgradnje,
            posodobljeno_ob = NOW();
    """
    data_to_insert = [
        (
            item['site'],
            clean_status(item['status']),
            item['type'],
            item['price'],
            item.get('price_unit', 'total'),
            item['location'],
            item['area'],
            item['features'],
            item['link'],
            item['image'],
            item.get('novogradnja', False),
            item.get('leto_izgradnje')
        )
        for item in valid_listings
    ]
    try:
        print(f"\n[↑] Povezujem se s Supabase in osvežujem {len(data_to_insert)} oglasov...")
        conn = psycopg2.connect(DB_URI)
        cur = conn.cursor()
        execute_values(cur, query, data_to_insert, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
        conn.commit()
        cur.close()
        conn.close()
        print("[✓] Podatki uspešno shranjeni/posodobljeni! (Baza je avtomatsko preverila zgodovino cen via Trigger)")
    except Exception as e:
        print(f"[X] Napaka pri vpisu v bazo podatkov: {e}")

# --- GLAVNA FUNKCIJA ZA ZAGON CELOTNEGA CIKLA ---
def celoten_zagon_strganja():
    print("\n=========================================")
    
    scrapers = [
        GaleaScraper(),
        Si21Scraper(),
        SiolScraper(),
        LjubljanaScraper()
    ]
    all_listings = []

    for buy in [True, False]:
        buy_str = "PRODAJA" if buy else "ODDAJA"
        for scraper in scrapers:
            print(f"\n[+] Poganjam vir: {scraper.name.upper()} ({buy_str})")
            try:
                # Popolnoma avtomatizirana BULK scraperja brez omejitev parametrov
                if scraper.name in ["galea", "si21-nepremicnine"]:
                    results = scraper.scrape(buy=buy)
                else:
                    results = scraper.scrape(limit=150, buy=buy, property_type="flat")
                    
                for item in results:
                    all_listings.append(item)
                print(f"[✓] {scraper.name} vrnil {len(results)} oglasov za obdelavo.")
                time.sleep(random.uniform(1.5, 3.5))
            except Exception as e:
                print(f"[X] Napaka pri izvajanju scraperja {scraper.name}: {e}")

    # Shranimo vse v bazo (Trigger bo poskrbel za zgodovino cen)
    save_to_database(all_listings)
    
    # Poflikamo luknje
    popravi_manjkajoce_podatke()
    
    # Počistimo podvojene slike
    dnevno_ciscenje_podvojenih_slik()
    print(f"\n[⏰] Cikel zaključen ob {time.strftime('%H:%M:%S')}. Čakam na naslednji termin...")

# --- NASTAVITEV ČASOVNIKOV ---
# Nastavimo zagon dvakrat na dan (npr. ob 05:00 zjutraj in 17:00 popoldan)
schedule.every().day.at("05:00").do(celoten_zagon_strganja)
schedule.every().day.at("17:00").do(celoten_zagon_strganja)

if __name__ == "__main__":
    print("==================================================")
    print(" 🤖 SISTEM ZA 24/7 SPREMLJANJE NEPREMIČNIN ZAGANAN ")
    print("==================================================")
    
    # Za test: Ob prvem ročnem zagonu takoj enkrat poženi celoten cikel,
    # da vidiš, če vse deluje, nato pa bo skripta prešla v čakanje.
    celoten_zagon_strganja()
    
    # Neskončna zanka, ki drži skripto pri življenju na strežniku ali računalniku
    while True:
        schedule.run_pending()
        time.sleep(1)  # Preveri časovnike vsako sekundo (0 % CPU poraba)
