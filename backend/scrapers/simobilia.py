import re
import time
import random
from scrapers.base_scraper import BaseScraper


class SimobiliaScraper(BaseScraper):
    """Scraper for SIMOBILIA nepremicnine (simobilia.si) — Joomla-based agency."""

    def __init__(self):
        super().__init__(
            name="simobilia",
            base_url="https://www.simobilia.si",
        )

    def _parse_listing(self, prop_div):
        """Parse a single div.property element."""
        try:
            # Status (Prodaja/Oddaja) - normalize
            status_el = prop_div.find(class_="status")
            raw_status = status_el.get_text(strip=True) if status_el else ""
            # Fallback: check link URL for prodaja/oddaja
            link_tag = prop_div.find("a", href=True)
            href = link_tag["href"] if link_tag else ""
            if not raw_status and "oddaj" in href.lower():
                raw_status = "Oddaja"
            elif not raw_status:
                raw_status = "Prodaja"  # Default to sale
            if "prodaj" in raw_status.lower():
                status = "Prodaja"
            elif "oddaj" in raw_status.lower():
                status = "Oddaja"
            else:
                status = raw_status

            # Title (clean - remove trailing price that gets concatenated)
            title_el = prop_div.find(class_="property-title")
            title = title_el.get_text(strip=True) if title_el else "N/A"
            # Remove trailing price patterns like "128.900,00 €" from title
            title = re.sub(r'[\d.,]+\s*€\s*$', '', title).strip()

            # Price
            price_el = prop_div.find(class_="price")
            price_text = price_el.get_text(strip=True) if price_el else "N/A"
            price = self.clean_price(price_text)
            price_unit = self.detect_price_unit(price_text)

            # Area and year from summary/meta
            area = 0.0
            year_built = None
            meta_div = prop_div.find(class_="property-meta")
            if meta_div:
                text = meta_div.get_text(" ", strip=True)
                # Extract area (e.g., "Površina 118,9 m2")
                area_match = re.search(
                    r"(?:Povr[šs]ina|Velikost|Area)\s*([\d.,]+)\s*m", text
                )
                if area_match:
                    area = self.clean_area(area_match.group(1))
                    # Cap area to DB precision (max 9999)
                    if area > 9999:
                        area = 0.0
                # Extract year (e.g., "Leto izgradnje 1985")
                year_match = re.search(r"(?:Leto|Year)\s*(\d{4})", text)
                if year_match:
                    year_built = int(year_match.group(1))

            # Location (from title - last meaningful part after comma)
            location = ""
            parts = title.split(",")
            # Filter out parts that look like prices or numbers
            location_parts = [
                p.strip() for p in parts[1:]
                if p.strip() and not re.match(r'^[\d.,€ ]+$', p.strip())
                and len(p.strip()) > 1
            ]
            if location_parts:
                location = location_parts[-1]
            elif len(parts) == 1:
                location = parts[0].strip()

            # Link
            link_tag = prop_div.find("a", href=True)
            href = link_tag["href"] if link_tag else ""
            full_link = self.absolute_url(href)

            # Image
            img_tag = prop_div.find("img")
            img_src = ""
            if img_tag:
                img_src = img_tag.get("src", "") or img_tag.get("data-src", "")
                if img_src and not img_src.startswith("http"):
                    img_src = self.base_url + img_src

            # Features
            features_arr = []
            if year_built:
                features_arr.append(f"Letnik: {year_built}")

            return {
                "site": self.name,
                "status": status,
                "type": title,
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
        Scrape all SIMOBILIA listings across all pages.
        Uses ?start=X pagination (12 per page).
        """
        vsi_oglasi = []
        start = 0
        per_page = 12

        while True:
            if start == 0:
                url = f"{self.base_url}/si/nepremicnine"
            else:
                url = f"{self.base_url}/si/nepremicnine.html?start={start}"

            soup = self._get_soup(url)
            if not soup:
                break

            props = soup.find_all("div", class_="property")
            if not props:
                break

            trenutna_stran_stevec = 0

            for prop_div in props:
                item = self._parse_listing(prop_div)
                if item and item.get("link") and item["link"] != self.base_url and item.get("price", 0) > 0:
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

            if trenutna_stran_stevec == 0 and start > 0:
                break

            print(
                f"    [Strana {start // per_page + 1}] Nabranih {trenutna_stran_stevec} oglasov."
            )
            start += per_page
            time.sleep(random.uniform(0.5, 1.5))

            # Safety: stop after 20 pages
            if start > 240:
                break

        return vsi_oglasi
