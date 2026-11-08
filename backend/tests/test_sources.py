"""Testi razčlenjevalnikov na shranjenih straneh (brez omrežja)."""

from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from scrapers.mestonepremicnin import MestoScraper
from scrapers.si21 import Si21Scraper

FIXTURES = Path(__file__).parent / "fixtures"


def load(name):
    return BeautifulSoup((FIXTURES / name).read_text(encoding="utf-8"), "html.parser")


@pytest.fixture()
def si21():
    scraper = Si21Scraper()
    scraper.min_delay = scraper.max_delay = 0
    return scraper


@pytest.fixture()
def mesto():
    scraper = MestoScraper()
    scraper.min_delay = scraper.max_delay = 0
    return scraper


def test_si21_parses_cards(si21):
    listings = si21.parse_page(load("si21_page.html"), prop_type="flat", buy=True)
    assert len(listings) == 2

    first, second = listings
    assert first["site"] == "si21-nepremicnine"
    assert first["status"] == "prodaja"
    assert first["price"] == 189000
    assert first["price_unit"] == "total"
    assert first["area"] == pytest.approx(62.5)
    assert first["location"] == "Ljubljana"
    assert first["leto_izgradnje"] == 2008
    assert first["link"] == "https://nepremicnine.si21.com/oglas/1001"
    assert first["novogradnja"] is False

    # Druga kartica: relativna povezava, razpon cene, novogradnja brez floorSize.
    assert second["link"] == "https://nepremicnine.si21.com/nepremicnine/novogradnja/2002"
    assert second["price"] == 250000
    assert second["area"] == pytest.approx(55)
    assert second["location"] == "Domžale"
    assert second["novogradnja"] is True
    assert second["image"] == "https://nepremicnine.si21.com/media/2002.jpg"


def test_si21_rent_sets_oddaja(si21):
    listings = si21.parse_page(load("si21_page.html"), prop_type="flat", buy=False)
    assert {listing["status"] for listing in listings} == {"oddaja"}


def test_si21_ignores_page_without_container(si21):
    soup = BeautifulSoup("<div class='nekaj'></div>", "html.parser")
    assert si21.parse_page(soup, prop_type="flat", buy=True) == []


def test_mesto_parses_cards(mesto):
    listings = mesto.parse_page(load("mesto_page.html"))
    assert len(listings) == 2

    first, second = listings
    assert first["status"] == "Prodaja"
    assert first["type"] == "Stanovanje"
    assert first["price"] == 289000
    assert first["price_unit"] == "total"
    assert first["area"] == pytest.approx(72.5)
    assert first["location"] == "Ljubljana - Center"
    assert first["link"] == (
        "https://www.mestonepremicnin.si/nepremicnina/123/stanovanje-ljubljana-center"
    )
    assert first["image"] == "https://cdn.mestonepremicnin.si/123.jpg"
    assert first["leto_izgradnje"] == 1998
    assert "Novo" in first["features"]

    # Najemnina: "€/mesec" ni cena na m², povezava pa je relativna.
    assert second["status"] == "Oddaja"
    assert second["price"] == 1200
    assert second["price_unit"] == "total"
    assert second["area"] == pytest.approx(45)
    assert second["link"] == "https://www.mestonepremicnin.si/nepremicnina/456/hisa-domzale"
    assert second["image"] == "https://www.mestonepremicnin.si/media/456.jpg"


def test_mesto_ignores_grid_without_listing_links(mesto):
    soup = BeautifulSoup(
        "<div class='listings-grid'><a href='/drugo'>x</a></div>", "html.parser"
    )
    assert mesto.parse_page(soup) == []
