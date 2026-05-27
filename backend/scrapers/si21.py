import json
import time
from scrapers.base_scraper import BaseScraper

class Si21Scraper(BaseScraper):
    def __init__(self):
        super().__init__(name="si21-nepremicnine", base_url="https://nepremicnine.si21.com")

    def scrape(self, buy=True, **kwargs):
        """
        Popoln BULK zagon za Si21. Prebrska vse glavne tipe nepremičnin,
        gre skozi celotno paginacijo (?strana=X) in zanesljivo detektira novogradnje.
        """
        types_map = {
            "flat": "/stanovanje.v1",
            "house": "/hisa.v2",
            "business": "/poslovni-prostor.v3",
            "land": "/zemljisce.v5"
        }
        
        action = 'prodaja.k1' if buy else 'oddaja.k2'
        vsi_oglasi = []

        # Tečemo čez vse definirane tipe nepremičnin
        for prop_type, type_path in types_map.items():
            page = 1
            print(f"  [→] Si21: Strgam kategorijo: {prop_type} ({action})")

            while True:
                # Si21 uporablja ?strana=X za paginacijo
                url = f"{self.base_url}/nepremicnine/{action}{type_path}?strana={page}"
                
                soup = self._get_soup(url)
                if not soup:
                    break

                container = soup.find('div', class_='oglasi-list')
                if not container:
                    break
                    
                # Poiščemo kartice na trenutni strani
                cards = container.find_all('a', class_=lambda c: c and ('simple-re-card' in c or 'ncom-re-card' in c))
                
                if not cards:
                    break  # Konec strani, izstop iz zanke

                trenutna_stran_stevec = 0

                for card in cards:
                    try:
                        # Pridobivanje JSON-LD podatkov
                        script_tag = card.find_next_sibling('script', type='application/ld+json')
                        if not script_tag:
                            continue  

                        parser = json.loads(script_tag.string)
                        
                        link = parser.get('url', card.get('href', ''))
                        full_link = link if link.startswith("http") else self.base_url + link
                        
                        # Preprečevanje duplikatov
                        if any(o['link'] == full_link for o in vsi_oglasi):
                            continue

                        title = parser.get('offers', {}).get('@type', "N/A")
                        location_str = parser.get('about', {}).get('address', {}).get('addressLocality', "N/A")
                        
                        # Čiščenje cene (Zanesljivo rešuje tudi razpone z najinim novim clean_price)
                        raw_price = parser.get('offers', {}).get('price', 0)
                        if not raw_price and 'priceSpecification' in parser.get('offers', {}):
                            price_text = card.find(class_='re-card-price') or card.find(class_='simple-re-card__price')
                            raw_price = price_text.get_text(strip=True) if price_text else "0"
                        price = self.clean_price(raw_price)

                        # Kvadratura
                        floor_size_data = parser.get('about', {}).get('floorSize', {})
                        if isinstance(floor_size_data, dict):
                            raw_area = floor_size_data.get('value', 0.0)
                        else:
                            # Fallback za novogradnje z min/max vrednostmi
                            raw_area = parser.get('about', {}).get('additionalProperty', {}).get('minValue', 0.0)
                        area = self.clean_area(raw_area)

                        # Pridobivanje slike
                        img_src = ""
                        img_tag = card.find('div', class_='image-wrapper')
                        if img_tag and img_tag.find('img'):
                            img_src = img_tag.find('img').get('src', '')
                        
                        if not img_src:
                            img_src = parser.get('about', {}).get('image', '')

                        if img_src:
                            if img_src.startswith('//'):
                                img_src = 'https:' + img_src
                            elif img_src.startswith('/'):
                                img_src = self.base_url + img_src

                        features_arr = []
                        year_built = parser.get('about', {}).get('yearBuilt')
                        if year_built:
                            features_arr.append(f"Letnik: {year_built}")

                        # 🌟 LOGIKA ZA STRGANJE IN PREPOZNAVO NOVOGRADNJE NA SI21
                        je_novogradnja = False
                        
                        # 1. indikator: Razred kartice vsebuje 'ncom-re-card' (New Commercial/Community Project)
                        card_classes = card.get('class', [])
                        if any('ncom-re-card' in cls for cls in card_classes):
                            je_novogradnja = True
                            
                        # 2. indikator: Tekst znotraj kartice vsebuje besedo "prosto" (zelene značke v kotu)
                        card_text = card.get_text(separator=" ").lower()
                        if "prosto:" in card_text:
                            je_novogradnja = True

                        vsi_oglasi.append({
                            "site": self.name,
                            "status": "prodaja" if buy else "oddaja",
                            "type": prop_type,
                            "price": price,
                            "location": location_str,
                            "area": area,
                            "features": features_arr,
                            "link": full_link,
                            "image": img_src,
                            "novogradnja": je_novogradnja
                        })
                        trenutna_stran_stevec += 1

                    except Exception as e:
                        continue

                if trenutna_stran_stevec == 0:
                    break

                print(f"    [Strana {page}] Nabranih {trenutna_stran_stevec} oglasov.")
                page += 1
                time.sleep(0.5) # Nežna pavza med podstranmi na istem portalu

        return vsi_oglasi