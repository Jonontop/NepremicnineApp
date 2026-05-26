from scrapers.base_scraper import BaseScraper

class AbcScraper(BaseScraper):
    def __init__(self):
        # Inicializiramo starša z imenom in osnovnim URL-jem
        super().__init__(name="ABC Nepremičnine", base_url="https://abc-nepremicnine.si")

    def scrape(self, limit=5, buy=True, property_type="flat"):
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
        url = f"{self.base_url}/Oglasi/{action}{vrsta}"
        
        # 3. Prenos strani preko bazne metode
        soup = self._get_soup(url)
        if not soup:
            return []

        listings = soup.find_all('div', class_='holder')
        data = []

        for item in listings[:limit]:
            try:
                # --- Title (Status: Prodamo/Oddamo) ---
                tag = item.find('ul', class_='more-info') if item.find('ul', class_='more-info') else None
                tag_title = tag.find_all('li')[0].find('span', class_="qty") if tag and tag.find_all('li') else None
                title = tag_title.get_text(strip=True) if tag else "N/A"

                # --- Features ---
                features_arr = []
                features_tag = tag.find_all('li', class_="info-label")[2:] if tag and tag.find_all('li') else []
                for f in features_tag:
                    if f.find('span', class_="qty"):
                        features_arr.append(f.get_text(strip=True))

                # --- Price ---
                price_tag = tag.find('span', class_='oglasCena').strong if tag else None
                # Klic podedovane funkcije preko self.
                price = self.clean_price(price_tag.get_text(strip=True) if price_tag else "N/A")

                # --- Location & Description ---
                loc_tag = item.find('div', class_='prop-title')
                location_str = loc_tag.h1.get_text(strip=True) if loc_tag else "N/A"

                area_tag = tag.find_all('li')[1].find('span', class_="qty") if tag and tag.find_all('li') else None
                # Klic podedovane funkcije preko self.
                area = self.clean_area(area_tag.get_text(strip=True) if area_tag else "N/A")

                land_desc = loc_tag.h3.get_text(strip=True) if loc_tag and loc_tag.h3 else "N/A"

                # --- Image ---
                img_tag = item.find("div", class_="overlay")['style'][22:-2] if item.find("div", class_="overlay") and 'style' in item.find("div", class_="overlay").attrs else ""
                img_src = "https:" + img_tag if img_tag else ""

                # --- Link ---
                link = item.find('div', class_="overlayw").a['href'] if item.find('div', class_="overlayw") and item.find('div', class_="overlayw").a else ""

                data.append({
                    "site": self.name,
                    "status": title,
                    "type": land_desc,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": self.base_url + link if link else "",
                    "image": img_src
                })
            except Exception as item_error:
                # Če en oglas spodleti, ne želimo, da se cel scraper ustavi
                print(f"[{self.name}] Napaka pri branju posameznega oglasa: {item_error}")
                continue

        return data