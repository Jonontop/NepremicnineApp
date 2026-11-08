import json

from scrapers.base_scraper import BaseScraper

#: Selektor kartic v seznamu oglasov.
CARD_CLASSES = ("simple-re-card", "ncom-re-card")


class Si21Scraper(BaseScraper):
    def __init__(self):
        super().__init__(name="si21-nepremicnine", base_url="https://nepremicnine.si21.com")

    def _parse_card(self, card, prop_type, buy):
        """Pretvori eno kartico v slovar oglasa (ali `None`)."""
        script_tag = card.find_next_sibling('script', type='application/ld+json')
        if not script_tag or not script_tag.string:
            return None

        parser = json.loads(script_tag.string)

        link = parser.get('url') or card.get('href', '')
        full_link = self.absolute_url(link)

        title = parser.get('offers', {}).get('@type', "N/A")
        location_str = (
            parser.get('about', {}).get('address', {}).get('addressLocality', "N/A")
        )

        # Cena (zanesljivo reši tudi razpone, npr. "547.522 - 591.067 €")
        raw_price = parser.get('offers', {}).get('price', 0)
        if not raw_price and 'priceSpecification' in parser.get('offers', {}):
            price_text = card.find(class_='re-card-price') or card.find(
                class_='simple-re-card__price'
            )
            raw_price = price_text.get_text(strip=True) if price_text else "0"
        price = self.clean_price(raw_price)
        price_unit = self.detect_price_unit(raw_price)

        # Kvadratura
        about = parser.get('about', {}) or {}
        floor_size_data = about.get('floorSize')
        if isinstance(floor_size_data, dict):
            raw_area = floor_size_data.get('value', 0.0)
        else:
            raw_area = floor_size_data or 0.0
        if not raw_area:
            # Fallback za novogradnje z min/max vrednostmi
            raw_area = (about.get('additionalProperty') or {}).get('minValue', 0.0)
        area = self.clean_area(raw_area)

        # Slika
        img_src = ""
        img_tag = card.find('div', class_='image-wrapper')
        if img_tag and img_tag.find('img'):
            img_src = img_tag.find('img').get('src', '')
        if not img_src:
            img_src = about.get('image', '') or ""
        if img_src:
            img_src = self.absolute_url(img_src)

        features_arr = []
        year_built_raw = about.get('yearBuilt')
        if year_built_raw:
            features_arr.append(f"Letnik: {year_built_raw}")
        year_built = self.extract_year(year_built_raw)

        # Novogradnja: poseben razred kartice ali zelena oznaka "Prosto:"
        je_novogradnja = False
        card_classes = card.get('class', []) or []
        if any('ncom-re-card' in cls for cls in card_classes):
            je_novogradnja = True
        if "prosto:" in card.get_text(separator=" ").lower():
            je_novogradnja = True

        return {
            "site": self.name,
            "status": "prodaja" if buy else "oddaja",
            "type": prop_type,
            "price": price,
            "location": location_str,
            "area": area,
            "features": features_arr,
            "link": full_link,
            "image": img_src,
            "novogradnja": je_novogradnja,
            "price_unit": price_unit,
            "leto_izgradnje": year_built,
        }

    def parse_page(self, soup, prop_type, buy):
        """Pretvori eno stran seznama v seznam oglasov (brez omrežja)."""
        container = soup.find('div', class_='oglasi-list')
        if not container:
            return []

        cards = container.find_all(
            'a', class_=lambda c: c and any(marker in c for marker in CARD_CLASSES)
        )
        listings = []
        for card in cards:
            try:
                item = self._parse_card(card, prop_type, buy)
            except Exception:
                # Ena polomljena kartica ne sme ustaviti cele strani.
                continue
            if item and item.get("link"):
                listings.append(item)
        return listings

    def scrape(self, buy=True, **kwargs):
        """
        Popoln BULK zagon za Si21. Prebrska vse glavne tipe nepremičnin,
        gre skozi celotno paginacijo (?strana=X) in zanesljivo detektira novogradnje.
        """
        types_map = {
            "flat": "/stanovanje.v1",
            "house": "/hisa.v2",
            "business": "/poslovni-prostor.v3",
            "land": "/zemljisce.v5",
        }

        action = 'prodaja.k1' if buy else 'oddaja.k2'
        vsi_oglasi = []
        seen_links = set()
        max_pages = int(kwargs.get("max_pages") or 50)

        for prop_type, type_path in types_map.items():
            page = 1
            print(f"  [→] Si21: Strgam kategorijo: {prop_type} ({action})")

            while page <= max_pages:
                url = f"{self.base_url}/nepremicnine/{action}{type_path}?strana={page}"
                soup = self._get_soup(url)
                if not soup:
                    break

                page_listings = self.parse_page(soup, prop_type, buy)
                if not page_listings:
                    break

                new_on_page = 0
                for item in page_listings:
                    if item["link"] in seen_links:
                        continue
                    seen_links.add(item["link"])
                    vsi_oglasi.append(item)
                    new_on_page += 1

                if new_on_page == 0:
                    # Stran se ponavlja -> konec paginacije.
                    break

                print(f"    [Strana {page}] Nabranih {new_on_page} oglasov.")
                page += 1

        return vsi_oglasi
