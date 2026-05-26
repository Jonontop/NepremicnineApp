from scrapers.base_scraper import BaseScraper

class LjubljanaScraper(BaseScraper):
    def __init__(self):
        super().__init__(name="ljubljananepremicnine", base_url="https://www.ljubljananepremicnine.si")

    def scrape(self, limit=5, buy=True, property_type="flat", **kwargs):
        # 1. Mapiranje tipov nepremičnin
        types_map = {
            "flat": "/stanovanje.v1",
            "house": "/hisa.v2",
            "business": "/poslovni-prostor.v3",
            "land": "/zemljisce.v5"
        }
        vrsta = types_map.get(property_type, "")

        # 2. Sestavljanje URL-ja
        action = 'prodaja.k1' if buy else 'oddaja.k2'
        url = f"{self.base_url}/nepremicnine/{action}{vrsta}"
        
        soup = self._get_soup(url)
        if not soup:
            return []

        listings = soup.find_all('a', class_='re-card')
        data = []

        for item in listings[:limit]:
            try:
                # --- Status (Prodamo/Oddamo) ---
                tag = item.find('span', class_='card-tag')
                title = tag.get_text(strip=True) if tag else "N/A"

                # --- Cena (očiščena v int) ---
                price_tag = item.find('span', class_='re-card_card_price')
                price = self.clean_price(price_tag.get_text(strip=True) if price_tag else "N/A")

                # --- Lastnosti (Kvadratura in ostalo) ---
                features_arr = []
                features_tag = item.find('div', class_="re-card_card_features")
                area_text = "N/A"
                
                if features_tag:
                    spans = features_tag.find_all('span')
                    if spans:
                        area_text = spans[0].get_text(strip=True) # Prvi span je kvadratura
                        for s in spans[1:]: 
                            features_arr.append(s.get_text(strip=True))

                area = self.clean_area(area_text)

                # --- Lokacija in kratek opis ---
                loc_tag = item.find('span', class_='re-card_card_location')
                location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"

                land_tag = item.find('h3') 
                land_desc = land_tag.get_text(strip=True) if land_tag else "N/A"

                # --- Slika ---
                img_container = item.find("div", class_="re-card_image")
                img_src = ""
                if img_container and img_container.find('img'):
                    img_src = img_container.find('img').get('src', '')
                    if img_src.startswith('//'):
                        img_src = "https:" + img_src

                data.append({
                    "site": self.name,
                    "status": title,
                    "type": land_desc,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": self.base_url + item['href'] if 'href' in item.attrs else "",
                    "image": img_src
                })
            except Exception as e:
                continue

        return data