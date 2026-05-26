import requests
from bs4 import BeautifulSoup
import re
import time
import random

class BaseScraper:
    def __init__(self, name, base_url):
        self.name = name
        self.base_url = base_url
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def _get_soup(self, url):
        """Skupna metoda za prenos strani z vgrajeno zaščito pred blokado."""
        # 1. Naključni premor med 1 in 3 sekundami, da ne streljaš requestov prehitro
        time.sleep(random.uniform(1.0, 3.0))
        
        # 2. Rotacija User-Agentov (strežnik misli, da prihajajo različni brskalniki)
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
        ]
        self.headers["User-Agent"] = random.choice(user_agents)

        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            print(f"[{self.name}] Napaka pri prenosu URL {url}: {e}")
            return None

    def clean_price(self, price_text):
        """Pretvori tekstualno ceno v celo število, pravilno odstrani decimalne cente."""
        if not price_text or price_text == "N/A":
            return 0
        if isinstance(price_text, int):
            return price_text
        
        # Pretvori v string in očisti morebitne presledke na začetku/koncu
        price_str = str(price_text).strip()
        
        # POPRAVEK ZA SIOL IN PODOBNE (npr. "340.000,00 €")
        # Če string vsebuje vejico, preverimo, ali gre za decimalna mesta na koncu
        if ',' in price_str:
            # Splitamo ob vejici na levi in desni del
            parts = price_str.split(',')
            # Če je na desni strani nekaj, kar se začne z dvema številkama (centi), vzamemo samo levi del
            # primer: "340.000" in "00 €" -> vzamemo "340.000"
            if len(parts) > 1 and len(parts[1].strip().split()[0]) == 2:
                price_str = parts[0]

        # Sedaj varno poberemo samo številke
        numeric_price = ''.join(filter(str.isdigit, price_str))
        return int(numeric_price) if numeric_price else 0

    def clean_area(self, area_text):
        """Pretvori tekstualno kvadraturo v float."""
        if not area_text or area_text == "N/A":
            return 0.0
        if isinstance(area_text, (int, float)):
            return float(area_text)
        area_text = str(area_text).replace(',', '.')
        match = re.search(r"[-+]?\d*\.\d+|\d+", area_text)
        return float(match.group()) if match else 0.0
    
    def extract_detail_page(self, soup):
        """
        Privzeta metoda za pridobivanje manjkajočih podatkov iz podstrani.
        Če child class nima svoje logike, se izvede ta fallback preko OG meta oznak.
        """
        data = {}
        
        # Poskusimo ujeti ceno iz meta oznak
        price_meta = soup.find("meta", property="og:price:amount") or soup.find("meta", property="product:price:amount")
        if price_meta and price_meta.get("content"):
            data["price"] = self.clean_price(price_meta["content"])
            
        # Poskusimo ujeti sliko iz meta oznak
        img_meta = soup.find("meta", property="og:image")
        if img_meta and img_meta.get("content"):
            data["image"] = img_meta["content"].strip()
            
        return data

    def scrape(self, limit=5, buy=True, property_type="flat", **kwargs):
        raise NotImplementedError("Vsak scraper mora implementirati svojo 'scrape' metodo!")