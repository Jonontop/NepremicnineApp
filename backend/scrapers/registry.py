"""Register virov, ki jih poganja aplikacija.

En seznam resnice za to, kateri viri obstajajo, ali so vklopljeni in ali
podpirajo polni zajem. `main.py` in testi uporabljajo ta seznam namesto
lastnih uvozov, zato nov vir ne more biti pozabljen v enem od obeh.

    from scrapers import registry

    for spec in registry.specs(enabled_only=True):
        result = registry.run_source(spec.key, buy=True)
        print(result.summary())
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass, field
from typing import Iterator

from .base_scraper import BaseScraper
from .models import ScrapeResult, SearchQuery


@dataclass(frozen=True)
class SourceSpec:
    """Opis enega vira oglasov."""

    key: str
    module: str
    class_name: str
    label: str = ""
    enabled: bool = True
    bulk: bool = True
    notes: str = ""
    aliases: tuple[str, ...] = field(default=())

    def build(self) -> BaseScraper:
        """Ustvari novo instanco scraperja (import šele ob klicu)."""
        module = importlib.import_module(self.module)
        scraper_class = getattr(module, self.class_name)
        return scraper_class()


SOURCES: tuple[SourceSpec, ...] = (
    SourceSpec("galea", "scrapers.galea", "GaleaScraper", label="Galea"),
    SourceSpec("si21", "scrapers.si21", "Si21Scraper", label="SI21"),
    SourceSpec("siol", "scrapers.siol", "SiolScraper", label="Siol"),
    SourceSpec(
        "ljubljana",
        "scrapers.ljubljanaNepremicnine",
        "LjubljanaScraper",
        label="Ljubljana Nepremičnine",
    ),
    SourceSpec(
        "mestonepremicnin",
        "scrapers.mestonepremicnin",
        "MestoScraper",
        label="Mesto Nepremičnin",
    ),
    SourceSpec("abc", "scrapers.abcnepremicnine", "AbcScraper", label="ABC Nepremičnine"),
    SourceSpec("insa", "scrapers.insa", "InsaScraper", label="INSA"),
    SourceSpec("simobilia", "scrapers.simobilia", "SimobiliaScraper", label="Simobilia"),
    SourceSpec("solterra", "scrapers.solterra", "SolTerraScraper", label="SolTerra"),
    SourceSpec(
        "realinvest",
        "scrapers.realinvest",
        "RealInvestScraper",
        label="Real Invest",
        enabled=False,
        notes="Eksperimentalno: ni preverjeno na živem viru, zato ni v ciklu.",
    ),
)

_BY_KEY = {spec.key: spec for spec in SOURCES}


def specs(enabled_only: bool = False, bulk_only: bool = False) -> tuple[SourceSpec, ...]:
    """Vrni vire, po potrebi le vklopljene oz. tiste s polnim zajemom."""
    selected = SOURCES
    if enabled_only:
        selected = tuple(spec for spec in selected if spec.enabled)
    if bulk_only:
        selected = tuple(spec for spec in selected if spec.bulk)
    return selected


def get_spec(key: str) -> SourceSpec:
    """Poišči vir po ključu; neznan ključ je napaka, ne tiho preskočen vir."""
    try:
        return _BY_KEY[str(key).strip().lower()]
    except KeyError:
        known = ", ".join(sorted(_BY_KEY))
        raise KeyError(f"Neznan vir {key!r}. Znani viri: {known}") from None


def build_all(enabled_only: bool = True) -> list[BaseScraper]:
    """Ustvari vse (privzeto vklopljene) scraperje."""
    return [spec.build() for spec in specs(enabled_only=enabled_only)]


def run_source(key: str, buy: bool = True, query: SearchQuery | None = None, **kwargs) -> ScrapeResult:
    """Požene en vir in vrne rezultat; napake so v rezultatu, ne izjeme."""
    spec = get_spec(key)
    try:
        scraper = spec.build()
    except Exception as exc:
        return ScrapeResult(source=spec.key, error=f"{type(exc).__name__}: {exc}")
    return scraper.scrape_listings(buy=buy, query=query, **kwargs)


def run_all(
    buy: bool = True,
    enabled_only: bool = True,
    query: SearchQuery | None = None,
) -> Iterator[ScrapeResult]:
    """Zaporedno požene vire in sproti vrača rezultate."""
    for spec in specs(enabled_only=enabled_only):
        yield run_source(spec.key, buy=buy, query=query)
