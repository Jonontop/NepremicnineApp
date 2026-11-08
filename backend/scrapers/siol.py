import time
import random
from scrapers.base_scraper import BaseScraper


class SiolScraper(BaseScraper):
    def __init__(self):
        super().__init__(name="siol-nepremicnine", base_url="https://nepremicnine.siol.net")

    def scrape(self, buy=True, **kwargs):
        """
        Popoln BULK zagon za Siol. Prebrska vse tipe nepremičnin
        in gre skozi celotno paginacijo (?page=X).
        """
        types_map = {
            "flat": "/stanovanje",
            "house": "/hisa",
            "business": "/poslovni-prostor",
            "land": "/zemljisce",
        }
        action = "prodaja" if buy else "oddaja"
        vsi_oglasi = []

        for prop_type, type_path in types_map.items():
            page = 1
            print(f"  [→] Siol: Strgam kategorijo: {prop_type} ({action})")

            while True:
                if page == 1:
                    url = f"{self.base_url}/iskanje/{action}{type_path}"
                else:
                    url = f"{self.base_url}/iskanje/{action}{type_path}?page={page}"

                soup = self._get_soup(url)
                if not soup:
                    break

                listings = soup.find_all("div", class_="item")
                if not listings:
                    break

                trenutna_stran_stevec = 0

                for item in listings:
                    try:
                        tag_title = item.find("span", class_="for-what")
                        title = tag_title.get_text(strip=True) if tag_title else "N/A"

                        price_tag = item.find("div", class_="list-price")
                        price_raw = price_tag.get_text(strip=True) if price_tag else "N/A"
                        price = self.clean_price(price_raw)
                        price_unit = self.detect_price_unit(price_raw)

                        # Najem prepoznamo po besedilu cene ("na mesec", "najem").
                        # Nizka cena sama po sebi ni znak najema (poceni zemljišča),
                        # zato jo izločimo; sicer odloča stran, s katere beremo.
                        price_lower = str(price_raw).lower()
                        looks_like_rent = (
                            "mesec" in price_lower
                            or "meseč" in price_lower
                            or "najem" in price_lower
                            or "/mes" in price_lower
                            or "month" in price_lower
                        )
                        if buy and not looks_like_rent:
                            title = "Prodaja"
                        else:
                            title = "Oddaja"

                        text_p = item.find("p", class_="list-text")
                        land_desc = (
                            text_p.find_all("span")[0].get_text(strip=True)
                            if text_p and text_p.find_all("span")
                            else "N/A"
                        )

                        loc_tag = item.find("div", class_="address-text")
                        location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"

                        features_arr = []

                        area_tag = item.find("div", class_="list-meta")
                        meta_text = area_tag.get_text(" ", strip=True) if area_tag else "N/A"
                        area = self.clean_area(meta_text)
                        year_built = self.extract_year(
                            " ".join([meta_text, land_desc, location_str])
                        )
                        if year_built:
                            features_arr.append(f"Letnik: {year_built}")

                        thumb_a = item.find("a", class_="list-thumb")
                        img_src = thumb_a.img["src"] if thumb_a and thumb_a.img else ""
                        link = thumb_a["href"] if thumb_a else ""
                        full_link = self.absolute_url(link)
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
                                "price_unit": price_unit,
                                "leto_izgradnje": year_built,
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
