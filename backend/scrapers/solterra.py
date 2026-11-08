"""Scraper for SolTerra (solterra.si) — WordPress with es-listing/es-col-view cards."""

import re
import time
import random
from scrapers.base_scraper import BaseScraper


class SolTerraScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="solterra",
            base_url="https://solterra.si",
        )

    def _parse_card(self, card):
        """Parse a single es-col-view card."""
        try:
            # Price
            price_el = card.find(class_="es-price")
            price_text = price_el.get_text(strip=True) if price_el else "N/A"
            price = self.clean_price(price_text)
            price_unit = self.detect_price_unit(price_text)

            # Title (contains location, area, type)
            title_el = card.find("h2")
            title = title_el.get_text(strip=True) if title_el else "N/A"

            # Parse title: "OTLICA, 37.4 m2 – prodaja, hiša, samostojna"
            location = ""
            area = 0.0
            prop_type = ""
            status = "prodaja"

            if "–" in title:
                parts = title.split("–")
                loc_area = parts[0].strip()
                action_type = parts[1].strip() if len(parts) > 1 else ""

                # Location and area from first part
                loc_match = re.match(r"(.+?),\s*([\d.,]+)\s*m", loc_area)
                if loc_match:
                    location = loc_match.group(1).strip()
                    area = self.clean_area(loc_match.group(2))
                else:
                    location = loc_area

                # Status and type from second part
                if "oddaj" in action_type.lower():
                    status = "oddaja"
                prop_type = action_type
            else:
                location = title

            # Link
            link_el = card.find("a", href=True)
            link = link_el["href"] if link_el else ""

            # Image (check for data-src or src)
            img_src = ""
            img_el = card.find("img")
            if img_el:
                img_src = img_el.get("src", "") or img_el.get("data-src", "")

            # Year from text
            year_built = self.extract_year(card.get_text())

            features_arr = []
            if year_built:
                features_arr.append(f"Letnik: {year_built}")

            return {
                "site": self.name,
                "status": status,
                "type": prop_type or "N/A",
                "price": price,
                "location": location,
                "area": area,
                "features": features_arr,
                "link": link,
                "image": img_src,
                "price_unit": price_unit,
                "leto_izgradnje": year_built,
            }
        except Exception:
            return None

    def scrape(self, buy=True, **kwargs):
        """Scrape all SolTerra listings."""
        vsi_oglasi = []

        soup = self._get_soup(f"{self.base_url}/nepremicnine/")
        if not soup:
            return vsi_oglasi

        cards = soup.find_all("div", class_="es-col-view")
        if not cards:
            # Try alternative: find within es-listing container
            listing = soup.find("div", class_="es-listing")
            if listing:
                cards = listing.find_all("div", class_="es-col-view")

        for card in cards:
            item = self._parse_card(card)
            if not item or not item.get("link"):
                continue
            if item.get("price", 0) <= 0:
                continue

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

        print(f"    Nabranih {len(vsi_oglasi)} oglasov.")
        return vsi_oglasi
