import time
import random
from scrapers.base_scraper import BaseScraper


class AbcScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="abc-nepremicnine", base_url="https://www.abc-nepremicnine.si"
        )

    def scrape(self, buy=True, **kwargs):
        """
        Popoln BULK zagon za ABC Nepremičnine. Prebrska vse tipe nepremičnin
        in gre skozi celotno paginacijo (?page=X).
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
            base_url = f"{self.base_url}/Oglasi/{action}{vrsta}"
            print(f"  [→] ABC Nepremičnine: Strgam kategorijo: {prop_type} ({action})")

            while True:
                url = base_url if page == 1 else f"{base_url}?page={page}"
                soup = self._get_soup(url)
                if not soup:
                    break

                listings = soup.find_all("div", class_="holder")
                if not listings:
                    break

                trenutna_stran_stevec = 0

                for item in listings:
                    try:
                        # --- Title (Status: Prodamo/Oddamo) ---
                        tag = (
                            item.find("ul", class_="more-info")
                            if item.find("ul", class_="more-info")
                            else None
                        )
                        tag_title = (
                            tag.find_all("li")[0]
                            .find("span", class_="qty")
                            if tag and tag.find_all("li")
                            else None
                        )
                        title = tag_title.get_text(strip=True) if tag_title else "N/A"

                        # --- Features ---
                        features_arr = []
                        features_tag = (
                            tag.find_all("li", class_="info-label")[2:]
                            if tag and tag.find_all("li")
                            else []
                        )
                        for f in features_tag:
                            if f.find("span", class_="qty"):
                                features_arr.append(f.get_text(strip=True))

                        # --- Price ---
                        price_tag = (
                            tag.find("span", class_="oglasCena").strong if tag else None
                        )
                        price = self.clean_price(
                            price_tag.get_text(strip=True) if price_tag else "N/A"
                        )

                        # --- Location & Description ---
                        loc_tag = item.find("div", class_="prop-title")
                        location_str = (
                            loc_tag.h1.get_text(strip=True) if loc_tag else "N/A"
                        )

                        area_tag = (
                            tag.find_all("li")[1]
                            .find("span", class_="qty")
                            if tag and tag.find_all("li")
                            else None
                        )
                        area = self.clean_area(
                            area_tag.get_text(strip=True) if area_tag else "N/A"
                        )

                        land_desc = (
                            loc_tag.h3.get_text(strip=True)
                            if loc_tag and loc_tag.h3
                            else "N/A"
                        )

                        # --- Image ---
                        overlay = item.find("div", class_="overlay")
                        img_tag_style = (
                            overlay["style"][22:-2]
                            if overlay and "style" in overlay.attrs
                            else ""
                        )
                        img_src = "https:" + img_tag_style if img_tag_style else ""

                        # --- Link ---
                        overlayw = item.find("div", class_="overlayw")
                        link = (
                            overlayw.a["href"]
                            if overlayw and overlayw.a
                            else ""
                        )
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
                            }
                        )
                        trenutna_stran_stevec += 1

                    except Exception as item_error:
                        print(
                            f"[{self.name}] Napaka pri branju posameznega oglasa: {item_error}"
                        )
                        continue

                if trenutna_stran_stevec == 0:
                    break

                print(f"    [Strana {page}] Nabranih {trenutna_stran_stevec} oglasov.")
                page += 1
                time.sleep(random.uniform(0.5, 1.5))

        return vsi_oglasi
