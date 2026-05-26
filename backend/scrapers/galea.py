from scrapers.base_scraper import BaseScraper

class GaleaScraper(BaseScraper):
    def __init__(self):
        super().__init__(name="galea", base_url="https://www.galea.si")

    def scrape(self, limit=5, buy=True, property_type="flat", location="koroska"):
        vrsta = {
            "flat": "/stanovanje.v1",
            "house": "/hisa.v2",
            "business": "/poslovni-prostor.v3",
            "land": "/zemljisce.v5",
            "vacation": "/pocitniski-objekt.v9",
            "commercial": "/gospodarski-objekt.v8",
            "other": "/drugi-objekti.v4"
        }

        regija = {
            "podravska": "/Podravska.r12",
            "pomurska": "/Pomurska.r13",
            "koroska": "/Koroska.r7"
        }

        action = "prodaja.k1" if buy else "oddaja.k2"
        search_url = f"{self.base_url}/nepremicnine/{action}{vrsta.get(property_type, '')}{regija.get(location, '')}" 
        
        soup = self._get_soup(search_url)
        if not soup:
            return []

        listings = soup.find_all('div', class_="box-container") 
        data = []  

        for item in listings[:limit]:
            try:
                title = item.ul.li.get_text(strip=True) if item.ul and item.ul.li else "N/A"
                
                price_text = item.find("span", class_="oglasCena").get_text(strip=True) if item.find("span", class_="oglasCena") else "N/A"
                price = self.clean_price(price_text)
                
                all_lis = item.find('ul', class_="properti-info").find_all('li') if item.find('ul', class_="properti-info") else []
                area_text = all_lis[2].get_text(strip=True) if len(all_lis) > 2 else "N/A"
                area = self.clean_area(area_text)
                
                loc_tag = item.find('span', class_='col1').h5 if item.find('span', class_='col1') else None
                location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"
                
                features_arr = [feature.get_text(strip=True) for feature in all_lis[:2]]

                link = item.find("a", class_="overlay-link")['href'] if item.find("a", class_="overlay-link") else ""
                
                img_tag = item.find("div", class_="overlay")['style'][22:-2] if item.find("div", class_="overlay") and 'style' in item.find("div", class_="overlay").attrs else ""
                img_src = "https:" + img_tag if img_tag else ""

                description = item.find("span", class_="col1").h4.get_text(strip=True) if item.find("span", class_="col1") and item.find("span", class_="col1").h4 else "N/A"

                data.append({
                    "site": self.name,
                    "status": title,
                    "type": description,
                    "price": price,
                    "location": location_str,
                    "area": area,
                    "features": features_arr,
                    "link": self.base_url + link if link else "",
                    "image": img_src
                })
            except Exception as e:
                continue

        return data