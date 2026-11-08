import pytest

from scrapers.models import Listing, ScrapeResult, SearchQuery

LEGACY_ROW = {
    "site": "galea",
    "status": "Prodaja",
    "type": "stanovanje",
    "price": "189.000 €",
    "price_unit": "total",
    "location": "Ljubljana",
    "area": "62,5 m2",
    "features": ["Lega: jug", "Letnik: 2008"],
    "link": "https://www.galea.si/oglas/1",
    "image": "https://cdn.galea.si/1.jpg",
    "novogradnja": False,
    "leto_izgradnje": 2008,
}


def test_listing_from_legacy_normalizes_fields():
    listing = Listing.from_legacy(LEGACY_ROW)
    assert listing.source == "galea"
    assert listing.url == "https://www.galea.si/oglas/1"
    assert listing.status == "prodaja"
    assert listing.property_type == "flat"
    assert listing.price == 189000
    assert listing.area == pytest.approx(62.5)
    assert listing.year_built == 2008
    assert listing.features == ["Lega: jug", "Letnik: 2008"]
    assert listing.is_storable


def test_listing_is_not_storable_without_price_or_location():
    assert not Listing.from_legacy({**LEGACY_ROW, "price": 0}).is_storable
    assert not Listing.from_legacy({**LEGACY_ROW, "location": "N/A"}).is_storable
    assert not Listing.from_legacy({**LEGACY_ROW, "link": ""}).is_storable


def test_listing_roundtrip_preserves_legacy_contract():
    listing = Listing.from_legacy(LEGACY_ROW)
    legacy = listing.to_legacy()
    assert set(legacy) == {
        "site",
        "status",
        "type",
        "price",
        "price_unit",
        "location",
        "area",
        "features",
        "link",
        "image",
        "novogradnja",
        "leto_izgradnje",
    }
    assert Listing.from_legacy(legacy).price == listing.price


def test_listing_accepts_features_as_string():
    listing = Listing.from_legacy({**LEGACY_ROW, "features": "Novo, Letnik: 2020"})
    assert listing.features == ["Novo", "Letnik: 2020"]


@pytest.mark.parametrize("transaction", ["sale", "prodaja", "buy", "rent", "oddaja"])
def test_search_query_accepts_known_transactions(transaction):
    query = SearchQuery(transaction=transaction)
    assert query.transaction in ("sale", "rent")
    assert query.buy == (query.transaction == "sale")


def test_search_query_rejects_unknown_transaction():
    with pytest.raises(ValueError):
        SearchQuery(transaction="menjava")
    with pytest.raises(ValueError):
        SearchQuery(max_pages=0)


def test_search_query_allows_type():
    query = SearchQuery(property_types=("stanovanje",))
    assert query.allows_type("flat")
    assert not query.allows_type("land")
    assert SearchQuery().allows_type("land")


def test_scrape_result_summary_and_partitions():
    result = ScrapeResult.from_legacy(
        "galea",
        [LEGACY_ROW, {**LEGACY_ROW, "price": 0}, {**LEGACY_ROW, "link": ""}],
        pages_fetched=2,
        duration_s=1.5,
    )
    assert result.ok
    assert len(result.listings) == 3
    assert len(result.storable) == 1
    assert len(result.rejected) == 2
    assert "3 oglasov" in result.summary()
    assert len(result.legacy_listings()) == 3


def test_scrape_result_error_summary():
    result = ScrapeResult(source="siol", error="Timeout")
    assert not result.ok
    assert "NAPAKA" in result.summary()
