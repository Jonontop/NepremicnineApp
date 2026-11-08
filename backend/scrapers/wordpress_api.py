"""
WordPress REST API Scraper
==========================
Generic scraper for WordPress-based agencies that expose
property data via /wp-json/wp/v2/properties.

Currently works with:
- Real Invest (realinvest.si) — has full property API

Can be extended to any WP site that registers a 'properties'
custom post type with the WP REST API.
"""

import time
import random
import requests
from scrapers.base_scraper import BaseScraper


class WordPressApiScraper(BaseScraper):
    """Scraper that uses WordPress REST API for property listings."""

    def __init__(self, name, base_url, api_path="/wp-json/wp/v2/properties"):
        super().__init__(name=name, base_url=base_url)
        self.api_path = api_path

    def _fetch_properties_page(self, page=1, per_page=50):
        """Fetch a page of properties from the WP REST API."""
        url = f"{self.base_url}{self.api_path}"
        params = {"page": page, "per_page": per_page}
        try:
            r = requests.get(url, headers=self.headers, params=params, timeout=15)
            if r.status_code == 200:
                return r.json(), int(r.headers.get("X-WP-TotalPages", 1))
        except Exception as e:
            print(f"    [{self.name}] API error page {page}: {e}")
        return [], 0

    def _parse_property(self, prop):
        """Parse a single property from the WP REST API response."""
        try:
            # Title
            title = prop.get("title", {}).get("rendered", "N/A")

            # Link
            link = prop.get("link", "")

            # Status (sale/rent)
            prop_status = prop.get("property_status", "")
            if isinstance(prop_status, list) and len(prop_status) > 0:
                prop_status = prop_status[0]
            status = "prodaja" if "prodaj" in str(prop_status).lower() else "oddaja"

            # Type
            prop_type = prop.get("property_type", "")
            if isinstance(prop_type, list) and len(prop_type) > 0:
                prop_type = prop_type[0]

            # Location from taxonomy fields
            city = prop.get("property_city", "")
            state = prop.get("property_state", "")
            area_name = prop.get("property_area", "")
            if isinstance(city, list):
                city = city[0] if city else ""
            if isinstance(state, list):
                state = state[0] if state else ""
            if isinstance(area_name, list):
                area_name = area_name[0] if area_name else ""
            location = city or state or area_name or "N/A"

            # Area from meta
            meta = prop.get("property_meta", {})
            area = 0.0
            price = 0
            year_built = None
            if isinstance(meta, dict):
                area_val = meta.get("property_size", meta.get("area", 0))
                if area_val:
                    area = self.clean_area(str(area_val))
                price_val = meta.get("property_price", meta.get("price", 0))
                if price_val:
                    price = self.clean_price(str(price_val))
                year_val = meta.get("property_year", meta.get("year_built", None))
                if year_val:
                    year_built = self.extract_year(str(year_val))

            # Image
            img_src = ""
            media_id = prop.get("featured_media", 0)
            if media_id:
                # We'd need a separate API call to get the image URL
                # For now, try to extract from content
                content = prop.get("content", {}).get("rendered", "")
                if 'src="' in content:
                    start = content.index('src="') + 5
                    end = content.index('"', start)
                    img_src = content[start:end]

            # Features
            features = prop.get("property_feature", [])
            if isinstance(features, list):
                features = [str(f) for f in features]

            features_arr = []
            if year_built:
                features_arr.append(f"Letnik: {year_built}")

            return {
                "site": self.name,
                "status": status,
                "type": str(prop_type) if prop_type else title,
                "price": price,
                "location": location,
                "area": area,
                "features": features_arr,
                "link": link,
                "image": img_src,
                "price_unit": "total",
                "leto_izgradnje": year_built,
            }
        except Exception as e:
            return None

    def scrape(self, buy=True, **kwargs):
        """Scrape all properties via WP REST API with pagination."""
        vsi_oglasi = []
        page = 1
        max_pages = 50

        while page <= max_pages:
            props, total_pages = self._fetch_properties_page(page, per_page=50)

            if not props:
                break

            for prop in props:
                item = self._parse_property(prop)
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

            print(f"    [API strana {page}/{total_pages}] Nabranih {len(props)} oglasov.")
            page += 1
            time.sleep(random.uniform(0.3, 0.8))

            if page > total_pages:
                break

        return vsi_oglasi
