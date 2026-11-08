"""Kanonični modeli za scraperje.

Scraperji še vedno vračajo slovarje (da `main.py` in baza ostaneta
združljiva), vendar vsak rezultat pretvorimo v `Listing`, kjer je mogoče
preveriti in normalizirati polja na enem mestu.

    query = SearchQuery(transaction="sale", property_types=("flat",))
    result = scraper.scrape_listings(query=query)
    for listing in result.listings:
        print(listing.url, listing.price)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, Sequence

from . import normalizers as nz

TRANSACTION_SALE = "sale"
TRANSACTION_RENT = "rent"


@dataclass(frozen=True)
class SearchQuery:
    """Kaj naj adapter poišče. Ne vsebuje selektorjev ali URL-jev."""

    transaction: str = TRANSACTION_SALE
    property_types: Sequence[str] = ()
    max_pages: int = 50
    limit: int | None = None

    def __post_init__(self) -> None:
        transaction = str(self.transaction).strip().lower()
        if transaction in ("prodaja", "sale", "buy"):
            object.__setattr__(self, "transaction", TRANSACTION_SALE)
        elif transaction in ("oddaja", "rent", "najem"):
            object.__setattr__(self, "transaction", TRANSACTION_RENT)
        else:
            raise ValueError(f"Neznana transakcija: {self.transaction!r}")
        if self.max_pages < 1:
            raise ValueError("max_pages mora biti vsaj 1")

    @property
    def buy(self) -> bool:
        """Združljivost s starim `scrape(buy=True)` vmesnikom."""
        return self.transaction == TRANSACTION_SALE

    @property
    def status(self) -> str:
        return nz.STATUS_SALE if self.buy else nz.STATUS_RENT

    def allows_type(self, property_type: str) -> bool:
        if not self.property_types:
            return True
        return nz.normalize_property_type(property_type) in {
            nz.normalize_property_type(t) for t in self.property_types
        }


@dataclass
class Listing:
    """En oglas, normaliziran na skupno obliko."""

    source: str
    url: str
    status: str = nz.STATUS_OTHER
    property_type: str = "other"
    price: int = 0
    price_unit: str = "total"
    area: float = 0.0
    location: str = ""
    features: list[str] = field(default_factory=list)
    image: str = ""
    is_new_build: bool = False
    year_built: int | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_legacy(cls, row: Mapping[str, Any], source: str = "") -> "Listing":
        """Zgradi `Listing` iz slovarja, kot ga vračajo obstoječi scraperji."""
        data = dict(row or {})
        features = data.get("features") or []
        if isinstance(features, str):
            features = [part.strip() for part in features.split(",") if part.strip()]
        return cls(
            source=(source or str(data.get("site") or "")).strip(),
            url=str(data.get("link") or "").strip(),
            status=nz.normalize_status(data.get("status")),
            property_type=nz.normalize_property_type(data.get("type")),
            price=nz.clean_price(data.get("price")),
            price_unit=str(data.get("price_unit") or "total"),
            area=nz.clean_area(data.get("area")),
            location=str(data.get("location") or "").strip(),
            features=[str(feature) for feature in features],
            image=str(data.get("image") or "").strip(),
            is_new_build=bool(data.get("novogradnja", False)),
            year_built=nz.extract_year(data.get("leto_izgradnje")),
            raw=data,
        )

    @property
    def is_storable(self) -> bool:
        """Enaka pravila, kot jih uporablja `main.save_to_database`."""
        return (
            self.price > 0
            and bool(self.url)
            and not nz.is_missing(self.location)
        )

    def to_legacy(self) -> dict[str, Any]:
        """Nazaj v slovar, ki ga pričakujeta `main.py` in baza."""
        return {
            "site": self.source,
            "status": self.status,
            "type": self.property_type,
            "price": self.price,
            "price_unit": self.price_unit,
            "location": self.location,
            "area": self.area,
            "features": list(self.features),
            "link": self.url,
            "image": self.image,
            "novogradnja": self.is_new_build,
            "leto_izgradnje": self.year_built,
        }


@dataclass
class ScrapeResult:
    """Rezultat enega zagona enega vira."""

    source: str
    listings: list[Listing] = field(default_factory=list)
    pages_fetched: int = 0
    warnings: list[str] = field(default_factory=list)
    error: str | None = None
    duration_s: float = 0.0

    @property
    def ok(self) -> bool:
        return self.error is None

    @property
    def storable(self) -> list[Listing]:
        return [listing for listing in self.listings if listing.is_storable]

    @property
    def rejected(self) -> list[Listing]:
        return [listing for listing in self.listings if not listing.is_storable]

    def legacy_listings(self) -> list[dict[str, Any]]:
        return [listing.to_legacy() for listing in self.listings]

    @classmethod
    def from_legacy(
        cls,
        source: str,
        rows: Iterable[Mapping[str, Any]] = (),
        **meta: Any,
    ) -> "ScrapeResult":
        listings = [Listing.from_legacy(row, source=source) for row in rows]
        return cls(source=source, listings=listings, **meta)

    def summary(self) -> str:
        if not self.ok:
            return f"[{self.source}] NAPAKA: {self.error}"
        return (
            f"[{self.source}] {len(self.listings)} oglasov "
            f"({len(self.storable)} veljavnih), {self.pages_fetched} strani, "
            f"{self.duration_s:.1f}s"
        )
