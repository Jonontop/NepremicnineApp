import json
from scrapers.base_scraper import BaseScraper

class Si21Scraper(BaseScraper):
    def __init__(self):
        super().__init__(name="si21-nepremicnine", base_url="https://nepremicnine.si21.com")

    def scrape(self, limit=5, buy=True, property_type="flat"):
        types_map = {
            "flat": "/stanovanje.v1",
            "house": "/hisa.v2",
            "business": "/poslovni-prostor.v3",
            "land": "/zemljisce.v5"
        }
        action = 'prodaja.k1' if buy else 'oddaja.k2'
        url = f"{self.base_url}/nepremicnine/{action}{types_map.get(property_type, '')}"
        
        soup = self._get_soup(url)
        if not soup:
            return []

        container = soup.find('div', class_='oglasi-list')
        if not container:
            return []
            
        # 1. Poiščemo vse oglasne kartice (tako navadne kot novogradnje/izpostavljene)
        cards = container.find_all('a', class_=lambda c: c and ('simple-re-card' in c or 'ncom-re-card' in c))
        data = []

        # 2. Tečemo čez kartice in za vsako vzamemo sliko ter njen pripadajoči naslednji <script>
        for card in cards[:limit]:
            try:
                # --- PRIDOBIVANJE PODATKOV IZ <script> (naslednji brat element) ---
                script_tag = card.find_next_sibling('script', type='application/ld+json')
                if not script_tag:
                    continue  # Če kartica nima pripadajočega skripta, jo preskočimo

                parser = json.loads(script_tag.string)
                
                # Osnovni podatki iz JSON-LD
                title = parser.get('offers', {}).get('@type', "N/A")
                land_desc = parser.get('name', "N/A")
                link = parser.get('url', card.get('href', ''))
                full_link = link if link.startswith("http") else self.base_url + link
                
                # Lokacija
                location_str = parser.get('about', {}).get('address', {}).get('addressLocality', "N/A")
                
                # Cena (Zanesljivo iz JSON ali kot fallback iz strukture)
                raw_price = parser.get('offers', {}).get('price', 0)
                if not raw_price and 'priceSpecification' in parser.get('offers', {}):
                    # Nekatere novogradnje imajo ceno globlje v strukturi ali pa jo potegnemo iz HTML-ja
                    price_text = card.find(class_='re-card-price') or card.find(class_='simple-re-card__price')
                    raw_price = price_text.get_text(strip=True) if price_text else "0"
                price = self.clean_price(raw_price)

                # Kvadratura
                floor_size_data = parser.get('about', {}).get('floorSize', {})
                if isinstance(floor_size_data, dict):
                    raw_area = floor_size_data.get('value', 0.0)
                else:
                    # Fallback za kompleksnejše strukture (npr. min/max vrednosti pri novogradnjah)
                    raw_area = parser.get('about', {}).get('additionalProperty', {}).get('minValue', 0.0)
                area = self.clean_area(raw_area)

                # --- PRIDOBIVANJE SLIKE IZ KARTICE (image-wrapper) ---
                img_src = ""
                # Najprej poskusimo najti prvo sliko znotraj .image-wrapper-ja te kartice
                img_tag = card.find('div', class_='image-wrapper')
                if img_tag and img_tag.find('img'):
                    img_src = img_tag.find('img').get('src', '')
                
                # Fallback: Če slike ni v HTML, preverimo še JSON-LD (novogradnje jo imajo tam)
                if not img_src:
                    img_src = parser.get('about', {}).get('image', '')

                # Popravimo relativne poti slik (npr. če se začnejo z // ali /)
                if img_src:
                    if img_src.startswith('//'):
                        img_src = 'https:' + img_src
                    elif img_src.startswith('/'):
                        img_src = self.base_url + img_src

                features_arr = []
                # Če obstaja podatek o letu izgradnje, ga lahko vržemo med features
                year_built = parser.get('about', {}).get('yearBuilt')
                if year_built:
                    features_arr.append(f"Letnik: {year_built}")

                data.append({
                    "site": self.name,
                    "status": "prodaja" if buy else "oddaja",
                    "type": property_type,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": full_link,
                    "image": img_src
                })

            except Exception as e:
                print(f"Napaka pri parsiranju SI21 oglasa: {e}")
                continue

        return data