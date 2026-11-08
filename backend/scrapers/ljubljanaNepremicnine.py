import time
import random
from scrapers.base_scraper import BaseScraper


class LjubljanaScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="ljubljananepremicnine",
            base_url="https://www.ljubljananepremicnine.si",
        )

    def scrape(self, buy=True, **kwargs):
        """
        Popoln BULK zagon za LjubljanaNepremicnine. Prebrska vse tipe
        nepremičnin in gre skozi celotno paginacijo (?page=X).
        """
        types_map = {
            "flat": "/stanovanje.v1",
            "house": "/hisa.v2",
            "business": "/poslovni-prostor.v3",
            "land": "/zemljisce.v5",
        }
        action = "prodaja.k1" if buy else "oddaja.k2"
        vsi_oglasi = []

        for prop_type, vrsta in types_map.items():
            page = 1
            base_url = f"{self.base_url}/nepremicnine/{action}{vrsta}"
            print(f"  [→] LjubljanaNepremicnine: Strgam kategorijo: {prop_type} ({action})")

            while True:
                url = base_url if page == 1 else f"{base_url}?page={page}"
                soup = self._get_soup(url)
                if not soup:
                    break

                listings = soup.find_all("a", class_="re-card")
                if not listings:
                    break

                trenutna_stran_stevec = 0

                for item in listings:
                    try:
                        # --- Status (Prodamo/Oddamo -> prodaja/oddaja) ---
                        tag = item.find("span", class_="card-tag")
                        raw_title = tag.get_text(strip=True) if tag else "N/A"
                        if "prodaj" in raw_title.lower() or "prodamo" in raw_title.lower():
                            title = "Prodaja"
                        elif "oddaj" in raw_title.lower() or "oddamo" in raw_title.lower():
                            title = "Oddaja"
                        else:
                            title = raw_title

                        # --- Cena ---
                        price_tag = item.find("span", class_="re-card_card_price")
                        price = self.clean_price(
                            price_tag.get_text(strip=True) if price_tag else "N/A"
                        )

                        # --- Lastnosti (Kvadratura in ostalo) ---
                        features_arr = []
                        features_tag = item.find("div", class_="re-card_card_features")
                        area_text = "N/A"

                        if features_tag:
                            spans = features_tag.find_all("span")
                            if spans:
                                area_text = spans[0].get_text(strip=True)
                                for s in spans[1:]:
                                    features_arr.append(s.get_text(strip=True))

                        area = self.clean_area(area_text)

                        # --- Lokacija in kratek opis ---
                        loc_tag = item.find("span", class_="re-card_card_location")
                        location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"

                        land_tag = item.find("h3")
                        land_desc = land_tag.get_text(strip=True) if land_tag else "N/A"

                        # --- Slika ---
                        img_container = item.find("div", class_="re-card_image")
                        img_src = ""
                        if img_container and img_container.find("img"):
                            img_src = img_container.find("img").get("src", "")
                            if img_src.startswith("//"):
                                img_src = "https:" + img_src

                        # --- Link ---
                        href = item.get("href", "")
                        full_link = self.absolute_url(href)

                        if not full_link:
                            continue

                        # Preprečevanje duplikatov
                        if any(o["link"] == full_link for o in vsi_oglasi):
                            continue

                        vsi_oglasi.append(
                            {
                                "site": self.name,
                                "status": title,
                                "type": land_desc,
                                "price": price,
                                "location": location_str,
                                "area": area,
                                "features": features_arr,
                                "link": full_link,
                                "image": img_src,
                            }
                        )
                        trenutna_stran_stevec += 1

                    except Exception as e:
                        continue

                if trenutna_stran_stevec == 0:
                    break

                print(f"    [Strana {page}] Nabranih {trenutna_stran_stevec} oglasov.")
                page += 1
                time.sleep(random.uniform(0.5, 1.5))

        return vsi_oglasi
