import pytest

from scrapers import normalizers as nz


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("189.000 €", 189000),
        ("547.522 - 591.067 €", 547522),
        ("1.250 €/m²", 1250),
        ("2.500,00 €", 2500),
        ("€ 89.900", 89900),
        (189000, 189000),
        ("N/A", 0),
        ("", 0),
        (None, 0),
        ("-", 0),
        ("Po dogovoru", 0),
        (99_999_999_999, 0),
    ],
)
def test_clean_price(raw, expected):
    assert nz.clean_price(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("72,5 m2", 72.5),
        ("45 m²", 45.0),
        ("62.5", 62.5),
        (62.5, 62.5),
        ("N/A", 0.0),
        (None, 0.0),
    ],
)
def test_clean_area(raw, expected):
    assert nz.clean_area(raw) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("1.250 €/m²", "per_m2"),
        ("1.250 EUR/m2", "per_m2"),
        ("189.000 €", "total"),
        ("1.200 €/mesec", "total"),
        ("900 €/mes", "total"),
        (189000, "total"),
        (None, "total"),
    ],
)
def test_detect_price_unit(raw, expected):
    assert nz.detect_price_unit(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Letnik 1998", 1998),
        ("zgrajena 2024", 2024),
        ("1905", 1905),
        ("1750", None),
        ("N/A", None),
        (None, None),
    ],
)
def test_extract_year(raw, expected):
    assert nz.extract_year(raw) == expected


@pytest.mark.parametrize(
    ("base", "href", "expected"),
    [
        ("https://portal.si", "https://portal.si/oglas/1", "https://portal.si/oglas/1"),
        ("https://portal.si", "//cdn.portal.si/a.jpg", "https://cdn.portal.si/a.jpg"),
        ("https://portal.si", "/oglas/2", "https://portal.si/oglas/2"),
        ("https://portal.si", "oglas/3", "https://portal.si/oglas/3"),
        ("https://portal.si", "", ""),
        ("https://portal.si", None, ""),
    ],
)
def test_join_url(base, href, expected):
    assert nz.join_url(base, href) == expected


def test_join_url_does_not_duplicate_prefix():
    # Regresija: prej je nastalo https://portal/https://portal/...
    url = nz.join_url("https://nepremicnine.siol.net", "https://nepremicnine.siol.net/x")
    assert url == "https://nepremicnine.siol.net/x"
    assert url.count("https://") == 1


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Prodaja", "prodaja"),
        ("P R O D A J A", "prodaja"),
        ("Sale", "prodaja"),
        ("Oddaja", "oddaja"),
        ("Najem", "oddaja"),
        ("Rent", "oddaja"),
        ("", "drugo"),
        (None, "drugo"),
    ],
)
def test_normalize_status(raw, expected):
    assert nz.normalize_status(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("stanovanje", "flat"),
        ("Stanovanja", "flat"),
        ("Hiša", "house"),
        ("zemljišče", "land"),
        ("parcela", "land"),
        ("garaža", "garage"),
        ("garazaparkirno-mesto", "garage"),
        ("poslovni prostor", "business"),
        ("čoln", "other"),
        (None, "other"),
    ],
)
def test_normalize_property_type(raw, expected):
    assert nz.normalize_property_type(raw) == expected


def test_is_missing():
    assert nz.is_missing(None)
    assert nz.is_missing("N/A")
    assert nz.is_missing(" neznano ")
    assert nz.is_missing(0)
    assert not nz.is_missing("Ljubljana")
    assert not nz.is_missing(1200)
