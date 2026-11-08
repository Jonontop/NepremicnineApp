import pytest
import requests

from scrapers.base_scraper import BaseScraper
from scrapers.models import SearchQuery


class FakeResponse:
    def __init__(self, status_code, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}


class DummyScraper(BaseScraper):
    def __init__(self, rows=None, error=None):
        super().__init__(name="dummy", base_url="https://portal.si", min_delay=0, max_delay=0)
        self.rows = rows or []
        self.error = error
        self.calls = []

    def scrape(self, buy=True, **kwargs):
        self.calls.append({"buy": buy, "kwargs": kwargs})
        if self.error:
            raise self.error
        return self.rows


def test_absolute_url_joins_all_shapes():
    scraper = DummyScraper()
    assert scraper.absolute_url("/oglas/1") == "https://portal.si/oglas/1"
    assert scraper.absolute_url("//cdn.portal.si/a.jpg") == "https://cdn.portal.si/a.jpg"
    assert scraper.absolute_url("https://portal.si/oglas/2") == "https://portal.si/oglas/2"
    assert scraper.absolute_url(None) == ""


def test_retries_transient_error_then_succeeds(monkeypatch):
    scraper = DummyScraper()
    responses = [FakeResponse(503), FakeResponse(200, "<html></html>")]
    calls = []

    def fake_get(url, **kwargs):
        calls.append(url)
        return responses.pop(0)

    monkeypatch.setattr(scraper.session, "get", fake_get)

    response = scraper._get("https://portal.si/x")
    assert response is not None
    assert response.status_code == 200
    assert len(calls) == 2


def test_does_not_retry_404(monkeypatch):
    scraper = DummyScraper()
    calls = []

    def fake_get(url, **kwargs):
        calls.append(url)
        return FakeResponse(404)

    monkeypatch.setattr(scraper.session, "get", fake_get)

    assert scraper._get("https://portal.si/missing") is None
    assert len(calls) == 1


def test_gives_up_after_max_retries(monkeypatch):
    scraper = DummyScraper()
    calls = []

    def fake_get(url, **kwargs):
        calls.append(url)
        return FakeResponse(500)

    monkeypatch.setattr(scraper.session, "get", fake_get)

    assert scraper._get("https://portal.si/broken") is None
    assert len(calls) == scraper.max_retries + 1


def test_retries_network_exception(monkeypatch):
    scraper = DummyScraper()
    calls = []

    def fake_get(url, **kwargs):
        calls.append(url)
        if len(calls) == 1:
            raise requests.ConnectionError("povezava prekinjena")
        return FakeResponse(200, "<html></html>")

    monkeypatch.setattr(scraper.session, "get", fake_get)

    response = scraper._get("https://portal.si/retry")
    assert response is not None
    assert len(calls) == 2


def test_retry_after_header_is_bounded():
    response = FakeResponse(429, headers={"Retry-After": "9999"})
    assert BaseScraper._retry_after_seconds(response) == 30.0
    assert BaseScraper._retry_after_seconds(FakeResponse(429)) is None


def test_get_soup_counts_pages(monkeypatch):
    scraper = DummyScraper()
    monkeypatch.setattr(
        scraper.session, "get", lambda url, **kwargs: FakeResponse(200, "<div id='x'>1</div>")
    )
    soup = scraper._get_soup("https://portal.si/1")
    assert soup is not None and soup.find("div")["id"] == "x"
    assert scraper.pages_fetched == 1


def test_scrape_listings_converts_and_marks_rejected():
    rows = [
        {
            "site": "dummy",
            "status": "Prodaja",
            "type": "stanovanje",
            "price": "189.000 €",
            "location": "Ljubljana",
            "area": "60 m2",
            "features": [],
            "link": "https://portal.si/1",
            "image": "",
            "price_unit": "total",
        },
        {
            "site": "dummy",
            "status": "Prodaja",
            "type": "stanovanje",
            "price": 0,
            "location": "N/A",
            "area": 0,
            "features": [],
            "link": "",
            "image": "",
        },
    ]
    result = DummyScraper(rows=rows).scrape_listings(buy=True)
    assert result.ok
    assert len(result.listings) == 2
    assert len(result.storable) == 1
    assert result.warnings
    assert result.legacy_listings()[0]["price"] == 189000


def test_scrape_listings_never_raises():
    result = DummyScraper(error=RuntimeError("portal je padel")).scrape_listings(buy=True)
    assert not result.ok
    assert "RuntimeError" in result.error
    assert result.listings == []


def test_scrape_listings_respects_query_transaction():
    scraper = DummyScraper()
    scraper.scrape_listings(query=SearchQuery(transaction="rent"))
    assert scraper.calls[0]["buy"] is False
    scraper.scrape_listings(buy=True)
    assert scraper.calls[1]["buy"] is True
