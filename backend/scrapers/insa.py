import re
import time
import random
from scrapers.base_scraper import BaseScraper


class InsaScraper(BaseScraper):
    """Scraper for INSA nepremicnine (insa.si) — WordPress-based agency."""

    def __init__(self):
        super().__init__(
            name="insa-nepremicnine",
            base_url="https://www.insa.si",
        )

    def _parse_listing(self, article):
        """Parse a single article.card.property element."""
        try:
            # Status (Prodaja/Oddaja)
            status_el = article.find(class_="posredovanje")
            status = status_el.get_text(strip=True) if status_el else "N/A"

            # Type (Hiša, Stanovanje, etc.)
            type_el = article.find(class_="meta-type")
            prop_type = ""
            if type_el:
                val = type_el.find(class_="value")
                prop_type = val.get_text(strip=True) if val else ""

            # Title / description
            title_el = article.find(class_="prop-title")
            title = title_el.get_text(strip=True) if title_el else prop_type

            # Location
            loc_el = article.find(class_="meta-location")
            location = ""
            if loc_el:
                val = loc_el.find(class_="value")
                location = val.get_text(strip=True) if val else ""

            # Area
            area_el = article.find(class_="meta-size")
            area_text = ""
            if area_el:
                val = area_el.find(class_="value")
                area_text = val.get_text(strip=True) if val else ""
            area = self.clean_area(area_text)

            # Year
            year_el = article.find(class_="meta-year")
            year_text = ""
            if year_el:
                val = year_el.find(class_="value")
                year_text = val.get_text(strip=True) if val else ""
            year_built = self.extract_year(year_text)

            # Price
            price_el = article.find(class_="price")
            price_text = price_el.get_text(strip=True) if price_el else "N/A"
            price = self.clean_price(price_text)
            price_unit = self.detect_price_unit(price_text)

            # Link
            link_tag = article.find("a", href=True)
            full_link = link_tag["href"] if link_tag else ""
            if not full_link.startswith("http"):
                full_link = self.base_url + full_link

            # Image
            img_tag = article.find("img")
            img_src = ""
            if img_tag:
                img_src = img_tag.get("src", "") or img_tag.get("data-src", "")
                if img_src and not img_src.startswith("http"):
                    img_src = self.base_url + img_src

            # Features
            features_arr = []
            if year_built:
                features_arr.append(f"Letnik: {year_built}")
            if "Ekskluzivno" in article.get_text():
                features_arr.append("Ekskluzivno")

            return {
                "site": self.name,
                "status": status,
                "type": prop_type or title,
                "price": price,
                "location": location,
                "area": area,
                "features": features_arr,
                "link": full_link,
                "image": img_src,
                "price_unit": price_unit,
                "leto_izgradnje": year_built,
            }
        except Exception as e:
            return None

    def scrape(self, buy=True, **kwargs):
        """
        Scrape all INSA listings across all pages.
        Uses /nepremicnine/page/X/ pagination.
        """
        vsi_oglasi = []
        page = 1

        while True:
            if page == 1:
                url = f"{self.base_url}/nepremicnine/"
            else:
                url = f"{self.base_url}/nepremicnine/page/{page}/"

            soup = self._get_soup(url)
            if not soup:
                break

            articles = soup.find_all(
                "article", class_=lambda c: c and "property" in c
            )
            if not articles:
                break

            trenutna_stran_stevec = 0

            for article in articles:
                item = self._parse_listing(article)
                if item and item.get("link") and item.get("price", 0) > 0:
                    # Filter by buy/rent
                    is_sale = "prodaj" in item["status"].lower()
                    if buy and not is_sale:
                        continue
                    if not buy and is_sale:
                        continue

                    # Deduplicate
                    if any(o["link"] == item["link"] for o in vsi_oglasi):
                        continue

                    vsi_oglasi.append(item)
                    trenutna_stran_stevec += 1

            if trenutna_stran_stevec == 0 and page > 1:
                break

            print(
                f"    [Strana {page}] Nabranih {trenutna_stran_stevec} oglasov."
            )
            page += 1
            time.sleep(random.uniform(0.5, 1.5))

            # Safety: stop after 20 pages
            if page > 20:
                break

        return vsi_oglasi
