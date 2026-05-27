import re
from scrapers.base_scraper import BaseScraper

class GaleaScraper(BaseScraper):
    def __init__(self):
        super().__init__(name="galea", base_url="https://www.galea.si")

    def scrape(self, buy=True, **kwargs):
        """
        Popoln BULK zagon za Galeo. Prebrska vse kombinacije vrst nepremičnin 
        in regij ter gre skozi vse podstrani (paginacija).
        """
        vrste = [
            "/stanovanje.v1",
            "/hisa.v2",
            "/poslovni-prostor.v3",
            "/zemljisce.v5",
            "/pocitniski-objekt.v9",
            "/gospodarski-objekt.v8",
            "/drugi-objekti.v4"
        ]

        regije = [
            "/Podravska.r12",
            "/Pomurska.r13",
            "/Koroska.r7"
        ]

        action = "prodaja.k1" if buy else "oddaja.k2"
        vsi_oglasi = []  

        for vrsta in vrste:
            for regija in regije:
                page = 1
                print(f"  [→] Galea: Strgam kategorijo: {vrsta} v regiji: {regija}")
                
                while True:
                    if page == 1:
                        search_url = f"{self.base_url}/nepremicnine/{action}{vrsta}{regija}"
                    else:
                        search_url = f"{self.base_url}/nepremicnine/{action}{vrsta}{regija}/p{page}"

                    soup = self._get_soup(search_url)
                    if not soup:
                        break  

                    listings = soup.find_all('div', class_="box-container") 
                    
                    if not listings:
                        break  

                    trenutna_stran_stevec = 0

                    for item in listings:
                        try:
                            link_tag = item.find("a", class_="overlay-link")
                            link = link_tag['href'] if link_tag else ""
                            if not link:
                                continue
                                
                            celoten_link = self.base_url + link

                            if any(o['link'] == celoten_link for o in vsi_oglasi):
                                continue

                            title = item.ul.li.get_text(strip=True) if item.ul and item.ul.li else "N/A"
                            
                            price_text = item.find("span", class_="oglasCena").get_text(strip=True) if item.find("span", class_="oglasCena") else "N/A"
                            price = self.clean_price(price_text)
                            
                            all_lis = item.find('ul', class_="properti-info").find_all('li') if item.find('ul', class_="properti-info") else []
                            area_text = all_lis[2].get_text(strip=True) if len(all_lis) > 2 else "N/A"
                            area = self.clean_area(area_text)
                            
                            loc_tag = item.find('span', class_='col1').h5 if item.find('span', class_='col1') else None
                            location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"
                            
                            features_arr = [feature.get_text(strip=True) for feature in all_lis[:2]]

                            img_tag = item.find("div", class_="overlay")['style'][22:-2] if item.find("div", class_="overlay") and 'style' in item.find("div", class_="overlay").attrs else ""
                            img_src = "https:" + img_tag if img_tag else ""

                            description = item.find("span", class_="col1").h4.get_text(strip=True) if item.find("span", class_="col1") and item.find("span", class_="col1").h4 else "N/A"

                            vsi_oglasi.append({
                                "site": self.name,
                                "status": title,
                                "type": description,
                                "price": price,
                                "location": location_str,
                                "area": area,
                                "features": features_arr,
                                "link": celoten_link,
                                "image": img_src,
                                "novogradnja": False  # Galea nima novogradenj
                            })
                            trenutna_stran_stevec += 1

                        except Exception as e:
                            continue

                    if trenutna_stran_stevec == 0:
                        break

                    print(f"    [Page {page}] Nabranih {trenutna_stran_stevec} oglasov.")
                    page += 1  
                    
        return vsi_oglasi