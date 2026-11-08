"""Scraper for Real Invest (realinvest.si) — WordPress with property REST API."""

from scrapers.wordpress_api import WordPressApiScraper


class RealInvestScraper(WordPressApiScraper):
    def __init__(self):
        super().__init__(
            name="realinvest",
            base_url="https://www.realinvest.si",
            api_path="/wp-json/wp/v2/properties",
        )
