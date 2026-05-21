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
            
        listings = container.find_all('script', type='application/ld+json')
        data = []

        for item in listings[:limit]:
            try:
                parser = json.loads(item.string)
                title = parser.get('offers', {}).get('@type', "N/A")
                land_desc = parser.get('name', "N/A")
                
                price = self.clean_price(parser.get('offers', {}).get('price', 0))
                location_str = parser.get('about', {}).get('address', {}).get('addressLocality', "N/A")
                area = self.clean_area(parser.get('about', {}).get('floorSize', {}).get('value', 0.0))
                
                features_arr = []
                img_src = "" # si21 v ld+json ponavadi nima direktne slike, jo lahko pustiš prazno ali razširiš kasneje
                link = parser.get('url', "")

                data.append({
                    "site": self.name,
                    "status": title,
                    "type": land_desc,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": link if link.startswith("http") else self.base_url + link,
                    "image": img_src
                })
            except Exception as e:
                continue

        return data