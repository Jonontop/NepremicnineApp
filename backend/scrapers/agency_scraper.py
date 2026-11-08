"""
Generic Agency Scraper Framework
=================================
A configurable scraper that can handle multiple small agencies
with minimal per-agency configuration.

Usage:
    from scrapers.agency_scraper import AgencyScraper, AgencyConfig

    config = AgencyConfig(
        name="my-agency",
        base_url="https://www.my-agency.si",
        listing_url="/nepremicnine/",
        pagination_type="page",       # "page" | "start" | "none"
        pagination_param="page",      # URL param name
        items_per_page=12,
        card_selector="div.property-card",
        # Field selectors (CSS or text patterns)
        price_selector=".price",
        location_selector=".location",
        area_selector=".area",
        type_selector=".type",
        image_selector="img",
        link_selector="a",
        # Status detection
        sale_keywords=["prodaja", "sale"],
        rent_keywords=["oddaja", "rent"],
    )
    scraper = AgencyScraper(config)
    results = scraper.scrape(buy=True)
"""

import re
import time
import random
from dataclasses import dataclass, field
from typing import List, Optional, Callable
from bs4 import BeautifulSoup, Tag
from scrapers.base_scraper import BaseScraper


@dataclass
class AgencyConfig:
    """Configuration for an agency scraper."""

    name: str
    base_url: str
    listing_url: str = "/"
    pagination_type: str = "page"  # "page" | "start" | "query" | "none"
    pagination_param: str = "page"
    items_per_page: int = 12
    max_pages: int = 20

    # Card/listing selector
    card_selector: str = "article"

    # Field selectors (CSS selectors)
    price_selector: str = ".price"
    location_selector: str = ".location"
    area_selector: str = ".area"
    type_selector: str = ".type"
    image_selector: str = "img"
    link_selector: str = "a[href]"

    # Custom parse function (overrides CSS selectors if provided)
    custom_parser: Optional[Callable] = None

    # Status detection keywords
    sale_keywords: List[str] = field(default_factory=lambda: ["prodaja", "sale", "prodaj"])
    rent_keywords: List[str] = field(default_factory=lambda: ["oddaja", "rent", "najem"])

    # Additional headers
    extra_headers: dict = field(default_factory=dict)


class AgencyScraper(BaseScraper):
    """Generic scraper configurable via AgencyConfig."""

    def __init__(self, config: AgencyConfig):
        super().__init__(name=config.name, base_url=config.base_url)
        self.config = config
        self.headers.update(config.extra_headers)

    def _get_page_url(self, page_num: int) -> str:
        """Build the URL for a given page number."""
        base = self.base_url + self.config.listing_url

        if self.config.pagination_type == "none":
            return base
        elif self.config.pagination_type == "page":
            if page_num == 1:
                return base
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}{self.config.pagination_param}={page_num}"
        elif self.config.pagination_type == "start":
            start = (page_num - 1) * self.config.items_per_page
            if start == 0:
                return base
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}{self.config.pagination_param}={start}"
        elif self.config.pagination_type == "query":
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}{self.config.pagination_param}={page_num}"
        return base

    def _extract_text(self, card: Tag, selector: str) -> str:
        """Extract text from a card using a CSS selector."""
        if not selector:
            return ""
        el = card.select_one(selector)
        return el.get_text(strip=True) if el else ""

    def _extract_attr(self, card: Tag, selector: str, attr: str) -> str:
        """Extract an attribute from a card using a CSS selector."""
        if not selector:
            return ""
        el = card.select_one(selector)
        if el and el.get(attr):
            val = el[attr]
            if not val.startswith("http"):
                val = self.base_url + val
            return val
        return ""

    def _extract_image(self, card: Tag) -> str:
        """Extract image URL from a card."""
        sel = self.config.image_selector
        if not sel:
            return ""
        el = card.select_one(sel)
        if not el:
            return ""
        src = el.get("src", "") or el.get("data-src", "") or el.get("data-lazy-src", "")
        if src and not src.startswith("http"):
            src = self.base_url + src
        return src

    def _extract_link(self, card: Tag) -> str:
        """Extract listing link from a card."""
        sel = self.config.link_selector
        if not sel:
            return ""
        el = card.select_one(sel)
        if not el or not el.get("href"):
            return ""
        href = el["href"]
        if not href.startswith("http"):
            href = self.base_url + href
        return href

    def _detect_status(self, card: Tag, text: str) -> str:
        """Detect if listing is for sale or rent."""
        lower = text.lower()
        for kw in self.config.rent_keywords:
            if kw in lower:
                return "oddaja"
        for kw in self.config.sale_keywords:
            if kw in lower:
                return "prodaja"
        return "prodaja"  # Default to sale

    def _parse_card(self, card: Tag) -> Optional[dict]:
        """Parse a single listing card."""
        try:
            if self.config.custom_parser:
                return self.config.custom_parser(self, card)

            card_text = card.get_text(" ", strip=True)

            # Price
            price_text = self._extract_text(card, self.config.price_selector)
            price = self.clean_price(price_text)
            price_unit = self.detect_price_unit(price_text)

            # Location
            location = self._extract_text(card, self.config.location_selector)

            # Area
            area_text = self._extract_text(card, self.config.area_selector)
            area = self.clean_area(area_text)

            # Type
            prop_type = self._extract_text(card, self.config.type_selector)

            # Link
            link = self._extract_link(card)

            # Image
            image = self._extract_image(card)

            # Status
            status = self._detect_status(card, card_text)

            # Year (extract from text)
            year_built = self.extract_year(card_text)

            # Features
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
                "image": image,
                "price_unit": price_unit,
                "leto_izgradnje": year_built,
            }
        except Exception:
            return None

    def scrape(self, buy=True, **kwargs):
        """Scrape all listings across all pages."""
        vsi_oglasi = []

        for page in range(1, self.config.max_pages + 1):
            url = self._get_page_url(page)
            soup = self._get_soup(url)
            if not soup:
                break

            cards = soup.select(self.config.card_selector)
            if not cards:
                break

            trenutna_stran_stevec = 0

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
                trenutna_stran_stevec += 1

            if trenutna_stran_stevec == 0 and page > 1:
                break

            print(
                f"    [Strana {page}] Nabranih {trenutna_stran_stevec} oglasov."
            )
            time.sleep(random.uniform(0.5, 1.5))

        return vsi_oglasi


# ============================================================
# Pre-configured agency configs
# ============================================================

AGENCY_CONFIGS = {
    "insa": AgencyConfig(
        name="insa-nepremicnine",
        base_url="https://www.insa.si",
        listing_url="/nepremicnine/",
        pagination_type="page",
        card_selector="article.property, article[class*='property']",
        price_selector=".price",
        location_selector=".meta-location .value",
        area_selector=".meta-size .value",
        type_selector=".meta-type .value",
        image_selector="img",
        link_selector="a[href]",
    ),
    "simobilia": AgencyConfig(
        name="simobilia",
        base_url="https://www.simobilia.si",
        listing_url="/si/nepremicnine",
        pagination_type="start",
        pagination_param="start",
        items_per_page=12,
        card_selector="div.property",
        price_selector=".price",
        location_selector=".property-title",
        area_selector=None,  # Extracted from meta text
        type_selector=".property-title",
        image_selector="img",
        link_selector="a[href]",
    ),
}


def get_agency_scraper(agency_name: str) -> Optional[AgencyScraper]:
    """Get a pre-configured scraper for a known agency."""
    config = AGENCY_CONFIGS.get(agency_name)
    if config:
        return AgencyScraper(config)
    return None
