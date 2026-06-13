import re
from urllib.parse import unquote

from scrapers.base_scraper import BaseScraper


class MestoScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="mestonepremicnin",
            base_url="https://www.mestonepremicnin.si",
        )

    def _extract_image(self, img_tag):
        if not img_tag:
            return ""
        src = img_tag.get("src", "")
        if "url=" in src:
            match = re.search(r"url=([^&]+)", src)
            if match:
                return unquote(match.group(1))
        if src.startswith("//"):
            return "https:" + src
        if src.startswith("/"):
            return self.base_url + src
        return src

    def _parse_listing_card(self, anchor):
        href = anchor.get("href", "")
        if not href.startswith("/nepremicnina/"):
            return None

        badge_div = anchor.find(
            "div",
            class_=lambda c: c and "absolute" in c and "top-4" in c,
        )
        badge_texts = (
            [p.get_text(strip=True) for p in badge_div.find_all("p")]
            if badge_div
            else []
        )
        status = next(
            (text for text in badge_texts if text in ("Prodaja", "Oddaja")),
            "N/A",
        )

        info = anchor.find("div", class_=re.compile(r"\bpx-3\b"))
        meta_parts = []
        if info:
            meta_div = info.find("div", class_=re.compile(r"\bflex-wrap\b"))
            if meta_div:
                for child in meta_div.find_all("div", recursive=False):
                    p_tag = child.find("p")
                    if p_tag:
                        meta_parts.append(p_tag.get_text(strip=True))

        subtype = meta_parts[0] if meta_parts else "N/A"
        area_text = meta_parts[1] if len(meta_parts) > 1 else "N/A"
        year_text = meta_parts[2] if len(meta_parts) > 2 else None

        loc_tag = info.find("p", class_=re.compile(r"\buppercase\b")) if info else None
        location_str = loc_tag.get_text(strip=True) if loc_tag else "N/A"

        category = "N/A"
        price_raw = "N/A"
        if info:
            price_tag = info.find("span", class_="font-bold")
            if price_tag:
                price_raw = price_tag.get_text(strip=True)
                price_div = price_tag.find_parent("div")
                if price_div:
                    price_rows = price_div.find_all("p", class_="whitespace-nowrap")
                    if price_rows:
                        category = price_rows[0].get_text(strip=True)

        price = self.clean_price(price_raw)
        area = self.clean_area(area_text)
        year_built = self.extract_year(year_text) if year_text else None

        features_arr = []
        if "Novo" in badge_texts:
            features_arr.append("Novo")
        if category != "N/A":
            features_arr.append(category)
        if year_built:
            features_arr.append(f"Letnik: {year_built}")

        img_tag = anchor.find("img")
        img_src = self._extract_image(img_tag)

        return {
            "site": self.name,
            "status": status,
            "type": subtype,
            "price": price,
            "location": location_str,
            "area": area,
            "features": features_arr,
            "link": self.base_url + href,
            "image": img_src,
            "price_unit": self.detect_price_unit(price_raw),
            "leto_izgradnje": year_built,
        }

    def scrape(self, limit=5, buy=True, property_type="flat", **kwargs):
        types_map = {
            "flat": "stanovanje",
            "house": "hisa",
            "business": "poslovni-prostor",
            "land": "parcela",
        }

        action = "prodaja" if buy else "oddaja"
        type_slug = types_map.get(property_type)

        base_path = f"{self.base_url}/sl/nepremicnine/{action}"
        if type_slug:
            base_path += f"/{type_slug}"

        data = []
        page = 1

        while len(data) < limit:
            url = base_path if page == 1 else f"{base_path}?page={page}"
            soup = self._get_soup(url)
            if not soup:
                break

            grid = soup.find(class_=re.compile(r"\blistings-grid\b"))
            if not grid:
                break

            anchors = [
                a
                for a in grid.find_all("a", href=True)
                if a["href"].startswith("/nepremicnina/")
            ]
            if not anchors:
                break

            page_count = 0
            for anchor in anchors:
                if len(data) >= limit:
                    break
                try:
                    item = self._parse_listing_card(anchor)
                    if item:
                        data.append(item)
                        page_count += 1
                except Exception as item_error:
                    print(
                        f"[{self.name}] Napaka pri branju posameznega oglasa: {item_error}"
                    )
                    continue

            if page_count == 0:
                break

            page += 1

        return data


if __name__ == "__main__":
    import json

    scraper = MestoScraper()
    results = scraper.scrape(limit=5)
    print(json.dumps(results, indent=4, ensure_ascii=False))
