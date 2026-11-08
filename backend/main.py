import json
import logging
import time
import random
import os
import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import schedule  # Knjižnica za časovnike

# Viri so definirani na enem mestu (scrapers/registry.py)
from scrapers import registry
from scrapers.normalizers import normalize_status

# Naloži okoljske spremenljivke
load_dotenv()
DB_URI = os.getenv("SUPABASE_DB_URI")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not DB_URI:
    print("[!] Opozorilo: SUPABASE_DB_URI ni nastavljen. Uporabljam REST API fallback.")
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    if not DB_URI:
        raise ValueError("[X] Napaka: Potrebujete SUPABASE_DB_URI ali SUPABASE_URL + SUPABASE_SERVICE_KEY!")

def clean_status(raw_status):
    """Ohranjeno zaradi združljivosti; logika je v normalizers."""
    return normalize_status(raw_status)

def dnevno_ciscenje_podvojenih_slik():
    if not DB_URI:
        print("\n[!] Preskakujem čiščenje podvojenih slik: SUPABASE_DB_URI ni nastavljen.")
        return
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
    if not DB_URI:
        print("\n[!] Preskakujem popravilo manjkajočih podatkov: SUPABASE_DB_URI ni nastavljen.")
        return
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

        scrapers_pool = {}
        for spec in registry.specs(enabled_only=True):
            try:
                scraper = spec.build()
            except Exception as exc:
                print(f"    [!] Scraper {spec.key} se ne naloži: {exc}")
                continue
            # V bazi je lahko zapisan kratek ključ ali polno ime vira.
            scrapers_pool[spec.key] = scraper
            scrapers_pool[scraper.name.lower()] = scraper
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
                        import re as _re
                        repaired_data["price"] = int(_re.sub(r'[^0-9]', '', price_meta["content"]))
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

def save_to_database_rest(valid_listings):
    """Shrani oglase v Supabase preko REST API (PostgREST)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[X] REST API: Manjka SUPABASE_URL ali SUPABASE_SERVICE_KEY.")
        return

    url = f"{SUPABASE_URL}/rest/v1/nepremicnine_oglasi"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    # Pripravi podatke za REST API (PostgREST uporablja JSON)
    rows = []
    for item in valid_listings:
        row = {
            "site": item["site"],
            "status": clean_status(item["status"]),
            "type": item["type"],
            "price": item["price"],
            "price_unit": item.get("price_unit", "total"),
            "location": item["location"],
            "area": item["area"],
            "features": item["features"],
            "link": item["link"],
            "image": item["image"],
            "novogradnja": item.get("novogradnja", False),
            "leto_izgradnje": item.get("leto_izgradnje"),
        }
        rows.append(row)

    # Pošlji v batchih po 100 (PostgREST ima limits)
    batch_size = 100
    total_saved = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
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
                print(f"[X] REST API napaka ({resp.status_code}): {resp.text[:200]}")
        except Exception as e:
            print(f"[X] REST API izjema: {e}")

    print(f"[✓] REST API: Shranjenih {total_saved}/{len(rows)} oglasov.")

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
        
        if not price or price <= 0 or not location or location == "N/A" or not location.strip() or not link or not link.strip():
            reason = []
            if not price or price <= 0:
                reason.append("cena je n/a ali 0")
            if not location or location == "N/A" or not location.strip():
                reason.append("kraj je n/a")
            if not link or not link.strip():
                reason.append("povezava je prazna")
            
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
    # Poskus 1: Neposredna PostgreSQL povezava
    if DB_URI:
        try:
            print(f"\n[↑] Povezujem se s Supabase (PostgreSQL) in osvežujem {len(data_to_insert)} oglasov...")
            conn = psycopg2.connect(DB_URI)
            cur = conn.cursor()
            execute_values(cur, query, data_to_insert, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
            conn.commit()
            cur.close()
            conn.close()
            print("[✓] Podatki uspešno shranjeni/posodobljeni! (PostgreSQL)")
            return
        except Exception as e:
            print(f"[!] PostgreSQL napaka ({e}), preklopim na REST API...")

    # Poskus 2: Supabase REST API (PostgREST)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        save_to_database_rest(valid_listings)
    else:
        print("[X] Noben način pisanja v bazo ni na voljo.")

# --- GLAVNA FUNKCIJA ZA ZAGON CELOTNEGA CIKLA ---
def celoten_zagon_strganja():
    print("\n=========================================")
    
    scrapers = registry.build_all(enabled_only=True)
    all_listings = []
    run_report = []

    for buy in [True, False]:
        buy_str = "PRODAJA" if buy else "ODDAJA"
        for scraper in scrapers:
            print(f"\n[+] Poganjam vir: {scraper.name.upper()} ({buy_str})")
            result = scraper.scrape_listings(buy=buy)
            run_report.append(result)
            all_listings.extend(result.legacy_listings())
            if result.ok:
                print(f"[✓] {result.summary()}")
            else:
                print(f"[X] {result.summary()}")
            time.sleep(random.uniform(1.5, 3.5))

    # Shranimo vse v bazo (Trigger bo poskrbel za zgodovino cen)
    save_to_database(all_listings)

    # Vir, ki je odpovedal, mora biti viden, ne samo v dnevniku.
    neuspesni = [result for result in run_report if not result.ok]
    if neuspesni:
        send_admin_email(
            f"{len(neuspesni)} vir(ov) ni vrnilo podatkov",
            "\n\n".join(result.summary() for result in neuspesni),
        )
    
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
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
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
