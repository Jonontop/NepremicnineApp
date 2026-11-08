"""Skupna osnova za vse scraperje.

Nudi:
- enotno sestavljanje povezav (`absolute_url`),
- normalizacijo cen/površin prek `normalizers`,
- omejeno število poskusov z exponential backoff in upoštevanjem `Retry-After`,
- počasen, omejen dostop do virov (`min_delay`/`max_delay`),
- `scrape_listings()`, ki vrne tipiziran `ScrapeResult` in nikoli ne vrže
  izjeme naprej (vir, ki pade, ne ustavi ostalih).
"""

from __future__ import annotations

import logging
import random
import time

import requests
from bs4 import BeautifulSoup

from . import normalizers as nz
from .models import ScrapeResult, SearchQuery

logger = logging.getLogger("nepremicnine.scraper")

#: Kode, pri katerih je smiselno poskusiti znova.
RETRYABLE_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})

#: Zgornja meja čakanja med poskusi (sekunde).
MAX_BACKOFF = 30.0

USER_AGENTS = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
)


class BaseScraper:
    #: Premor med zahtevami, da ne obremenjujemo vira.
    min_delay = 1.0
    max_delay = 2.5
    request_timeout = 15
    #: Število ponovnih poskusov poleg prvega.
    max_retries = 2

    def __init__(self, name, base_url, min_delay=None, max_delay=None):
        self.name = name
        self.base_url = str(base_url).rstrip("/")
        if min_delay is not None:
            self.min_delay = float(min_delay)
        if max_delay is not None:
            self.max_delay = float(max_delay)
        self.headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "sl-SI,sl;q=0.9,en;q=0.8",
        }
        self.session = requests.Session()
        self.pages_fetched = 0
        self._last_request_at = 0.0

    # ------------------------------------------------------------------
    # Omrežje
    # ------------------------------------------------------------------
    def _throttle(self):
        """Zagotovi minimalni premor med dvema zahtevama istega vira."""
        if self.max_delay <= 0:
            return
        delay = random.uniform(self.min_delay, self.max_delay)
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < delay:
            time.sleep(delay - elapsed)

    @staticmethod
    def _retry_after_seconds(response):
        raw = response.headers.get("Retry-After") if response is not None else None
        try:
            return min(float(raw), MAX_BACKOFF)
        except (TypeError, ValueError):
            return None

    def _get(self, url, **kwargs):
        """Prenese URL z omejenimi ponovitvami; vrne `Response` ali `None`."""
        for attempt in range(self.max_retries + 1):
            self._throttle()
            self.headers["User-Agent"] = random.choice(USER_AGENTS)
            try:
                response = self.session.get(
                    url, headers=self.headers, timeout=self.request_timeout, **kwargs
                )
                self._last_request_at = time.monotonic()
            except requests.RequestException as exc:
                self._last_request_at = time.monotonic()
                if attempt >= self.max_retries:
                    logger.warning("[%s] Prenos ni uspel (%s): %s", self.name, url, exc)
                    return None
                backoff = min(2.0 ** attempt, MAX_BACKOFF)
                logger.info(
                    "[%s] Ponovni poskus %s/%s čez %.1fs: %s",
                    self.name, attempt + 1, self.max_retries, backoff, url,
                )
                time.sleep(backoff)
                continue

            if response.status_code in RETRYABLE_STATUS and attempt < self.max_retries:
                backoff = self._retry_after_seconds(response) or min(
                    2.0 ** attempt, MAX_BACKOFF
                )
                logger.info(
                    "[%s] HTTP %s, čakam %.1fs in poskusim znova: %s",
                    self.name, response.status_code, backoff, url,
                )
                time.sleep(backoff)
                continue

            if response.status_code == 404:
                logger.info("[%s] 404 (oglas ne obstaja več): %s", self.name, url)
                return None
            if response.status_code >= 400:
                logger.warning(
                    "[%s] HTTP %s pri %s", self.name, response.status_code, url
                )
                return None
            return response
        return None

    def _get_soup(self, url):
        """Prenese stran in vrne `BeautifulSoup` (ali `None` ob napaki)."""
        response = self._get(url)
        if response is None:
            return None
        self.pages_fetched += 1
        return BeautifulSoup(response.text, "html.parser")

    # ------------------------------------------------------------------
    # Normalizacija (tanke ovitke okoli `normalizers`)
    # ------------------------------------------------------------------
    def absolute_url(self, href):
        """Pretvori povezavo iz oglasa v absolutni URL brez podvajanja."""
        return nz.join_url(self.base_url, href)

    def clean_price(self, price_text):
        return nz.clean_price(price_text)

    def clean_area(self, area_text):
        return nz.clean_area(area_text)

    def detect_price_unit(self, price_text):
        return nz.detect_price_unit(price_text)

    def extract_year(self, text):
        return nz.extract_year(text)

    def extract_detail_page(self, soup):
        """Fallback za manjkajoče podatke iz OG meta oznak na podstrani."""
        data = {}

        price_meta = soup.find("meta", property="og:price:amount") or soup.find(
            "meta", property="product:price:amount"
        )
        if price_meta and price_meta.get("content"):
            data["price"] = nz.clean_price(price_meta["content"])

        img_meta = soup.find("meta", property="og:image")
        if img_meta and img_meta.get("content"):
            data["image"] = img_meta["content"].strip()

        return data

    # ------------------------------------------------------------------
    # Rezultat
    # ------------------------------------------------------------------
    def scrape(self, limit=5, buy=True, property_type="flat", **kwargs):
        raise NotImplementedError(
            "Vsak scraper mora implementirati svojo 'scrape' metodo!"
        )

    def scrape_listings(self, buy=None, query: SearchQuery | None = None, **kwargs) -> ScrapeResult:
        """Požene `scrape()` in vrne tipiziran rezultat.

        Napake vira so zabeležene v `ScrapeResult.error`, da klicatelj
        (registry, main.py) nadaljuje z ostalimi viri.
        """
        if query is None:
            query = SearchQuery(transaction="sale" if buy is not False else "rent")
        elif buy is not None:
            query = SearchQuery(
                transaction="sale" if buy else "rent",
                property_types=query.property_types,
                max_pages=query.max_pages,
                limit=query.limit,
            )

        self.pages_fetched = 0
        started = time.perf_counter()
        try:
            rows = self.scrape(buy=query.buy, **kwargs) or []
        except Exception as exc:  # vir ne sme podreti celotnega cikla
            logger.exception("[%s] Scraper je odpovedal", self.name)
            return ScrapeResult(
                source=self.name,
                error=f"{type(exc).__name__}: {exc}",
                pages_fetched=self.pages_fetched,
                duration_s=time.perf_counter() - started,
            )

        result = ScrapeResult.from_legacy(
            self.name,
            rows,
            pages_fetched=self.pages_fetched,
            duration_s=time.perf_counter() - started,
        )
        if result.rejected:
            result.warnings.append(
                f"{len(result.rejected)} oglasov brez cene, kraja ali povezave"
            )
        logger.info(result.summary())
        return result
