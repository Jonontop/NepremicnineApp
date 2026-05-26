from scrapers.base_scraper import BaseScraper

class SiolScraper(BaseScraper):
    def __init__(self):
        super().__init__(name="siol-nepremicnine", base_url="https://nepremicnine.siol.net")

    def scrape(self, limit=5, buy=True, property_type="flat"):
        types_map = {
            "flat": "/stanovanje",
            "house": "/hisa",
            "business": "/poslovni-prostor",
            "land": "/zemljisce"
        }
        action = 'prodaja' if buy else 'oddaja'
        url = f"{self.base_url}/iskanje/{action}{types_map.get(property_type, '')}"
        
        soup = self._get_soup(url)
        if not soup:
            return []

        listings = soup.find_all('div', class_='item')
        data = []

        for item in listings[:limit]:
            try:
                tag_title = item.find('span', class_='for-what')
                title = tag_title.get_text(strip=True) if tag_title else "N/A"

                price_tag = item.find('div', class_='list-price')
                price = self.clean_price(price_tag.get_text(strip=True) if price_tag else "N/A")
                
                text_p = item.find('p', class_='list-text')
                land_desc = text_p.find_all('span')[0].get_text(strip=True) if text_p and text_p.find_all('span') else "N/A"

                loc_tag = item.find('div', class_='address-text')
                location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"

                features_arr = []

                area_tag = item.find('div', class_='list-meta')
                area = self.clean_area(area_tag.get_text(strip=True) if area_tag else "N/A")

                thumb_a = item.find("a", class_="list-thumb")
                img_src = thumb_a.img['src'] if thumb_a and thumb_a.img else ""
                link = thumb_a['href'] if thumb_a else ""

                # Popravek lepljenja URL-ja (odstranimo začetni / iz linka, če obstaja)
                clean_link = link[1:] if link.startswith('/') else link

                data.append({
                    "site": self.name,
                    "status": title,
                    "type": land_desc,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": f"{self.base_url}/{clean_link}",
                    "image": img_src
                })
            except Exception as e:
                continue

        return data